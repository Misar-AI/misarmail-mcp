/**
 * Request-body regression coverage for write tools.
 *
 * MisarMail's API is NOT uniformly cased — /send and /ab-tests use snake_case,
 * /campaigns, /templates, /contacts, and /landing-pages use camelCase — and
 * there is no request-transform layer (apiFetch sends JSON.stringify(args)
 * verbatim). Each test here mocks fetch and asserts the actual JSON body a
 * handler sends matches the real API route's Zod schema field names, so a
 * regression to the old (broken) field names fails loudly instead of silently
 * shipping a body the live API strips or rejects.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { dispatch } from "../../src/registry.js";
import { httpContext } from "../../src/lib/context.js";

const ctx = httpContext("msk_test", "https://example.invalid/v1");
const allowAll = () => true;

function mockFetchOnce(body: unknown = { success: true, data: {} }, status = 200) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(body), { status }),
  );
}

function sentBody(fetchMock: ReturnType<typeof mockFetchOnce>): Record<string, unknown> {
  const init = fetchMock.mock.calls[0]![1] as RequestInit;
  return JSON.parse(init.body as string);
}

function sentUrl(fetchMock: ReturnType<typeof mockFetchOnce>): string {
  return fetchMock.mock.calls[0]![0] as string;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("create_campaign body mapping", () => {
  it("maps snake_case args onto the real camelCase campaign schema", async () => {
    const fetchMock = mockFetchOnce();
    await dispatch(
      "create_campaign",
      {
        name: "Launch",
        subject: "Hello",
        from_email: "a@b.com",
        from_name: "Team",
        reply_to: "reply@b.com",
        html: "<p>hi</p>",
        text: "hi",
        template_id: "tpl_1",
        segment_id: "seg_1",
        scheduled_at: "2030-01-01T00:00:00.000Z",
      },
      ctx,
      allowAll,
    );

    const body = sentBody(fetchMock);
    expect(body).toMatchObject({
      name: "Launch",
      subject: "Hello",
      fromEmail: "a@b.com",
      fromName: "Team",
      replyTo: "reply@b.com",
      bodyHtml: "<p>hi</p>",
      bodyText: "hi",
      templateId: "tpl_1",
      segmentId: "seg_1",
      scheduledAt: "2030-01-01T00:00:00.000Z",
    });
    // No backing field on createCampaignSchema — must not be advertised or sent.
    expect(body).not.toHaveProperty("tags");
    expect(body).not.toHaveProperty("html");
    expect(body).not.toHaveProperty("from_email");
  });

  it("requires from_name in the tool schema", async () => {
    const { resolveTool } = await import("../../src/registry.js");
    expect(resolveTool("create_campaign")!.inputSchema.required).toContain("from_name");
    expect(resolveTool("create_campaign")!.inputSchema.properties).not.toHaveProperty("tags");
  });
});

describe("send_campaign scheduling", () => {
  it("sends camelCase scheduledAt on the campaign PATCH", async () => {
    const fetchMock = mockFetchOnce();
    await dispatch(
      "send_campaign",
      { campaign_id: "camp_1", scheduled_at: "2030-01-01T00:00:00.000Z" },
      ctx,
      allowAll,
    );
    const body = sentBody(fetchMock);
    expect(body).toEqual({ status: "scheduled", scheduledAt: "2030-01-01T00:00:00.000Z" });
    expect(body).not.toHaveProperty("scheduled_at");
  });
});

describe("create_template body mapping", () => {
  it("maps html/text/type onto bodyHtml/bodyText/templateType", async () => {
    const fetchMock = mockFetchOnce();
    await dispatch(
      "create_template",
      { name: "Welcome", subject: "Hi {{first_name}}", html: "<p>hi</p>", text: "hi", type: "transactional", variables: ["first_name"] },
      ctx,
      allowAll,
    );
    const body = sentBody(fetchMock);
    expect(body).toMatchObject({
      name: "Welcome",
      subject: "Hi {{first_name}}",
      bodyHtml: "<p>hi</p>",
      bodyText: "hi",
      templateType: "transactional",
      variables: ["first_name"],
    });
    expect(body).not.toHaveProperty("html");
    expect(body).not.toHaveProperty("text");
    expect(body).not.toHaveProperty("type");
  });
});

describe("contacts body mapping", () => {
  it("create_contact maps first_name/last_name/custom_fields and drops unsupported fields", async () => {
    const fetchMock = mockFetchOnce();
    await dispatch(
      "create_contact",
      {
        email: "a@b.com",
        first_name: "Ada",
        last_name: "Lovelace",
        tags: ["vip"],
        source: "import",
        custom_fields: { plan: "pro" },
      },
      ctx,
      allowAll,
    );
    const body = sentBody(fetchMock);
    expect(body).toMatchObject({
      email: "a@b.com",
      firstName: "Ada",
      lastName: "Lovelace",
      tags: ["vip"],
      source: "import",
      customFields: { plan: "pro" },
    });
    expect(body).not.toHaveProperty("first_name");
    expect(body).not.toHaveProperty("custom_fields");

    const { resolveTool } = await import("../../src/registry.js");
    const props = resolveTool("create_contact")!.inputSchema.properties!;
    expect(props).not.toHaveProperty("phone");
    expect(props).not.toHaveProperty("company");
    expect(props).not.toHaveProperty("job_title");
  });

  it("update_contact maps fields and lowercases email, dropping unsupported fields", async () => {
    const fetchMock = mockFetchOnce();
    await dispatch(
      "update_contact",
      {
        email: "A@B.com",
        first_name: "Ada",
        last_name: "Lovelace",
        status: "unsubscribed",
        custom_fields: { plan: "pro" },
      },
      ctx,
      allowAll,
    );
    const body = sentBody(fetchMock);
    expect(body).toEqual({
      email: "a@b.com",
      firstName: "Ada",
      lastName: "Lovelace",
      status: "unsubscribed",
      customFields: { plan: "pro" },
    });

    const { resolveTool } = await import("../../src/registry.js");
    const props = resolveTool("update_contact")!.inputSchema.properties!;
    expect(props).not.toHaveProperty("phone");
    expect(props).not.toHaveProperty("company");
    expect(props).not.toHaveProperty("job_title");
    expect(props).not.toHaveProperty("tags");
  });

  it("import_contacts maps per-row fields and the top-level update flag, dropping company", async () => {
    const fetchMock = mockFetchOnce();
    await dispatch(
      "import_contacts",
      {
        contacts: [
          { email: "a@b.com", first_name: "Ada", last_name: "Lovelace", tags: ["vip"] },
        ],
        update_existing: true,
      },
      ctx,
      allowAll,
    );
    const body = sentBody(fetchMock);
    expect(body).toEqual({
      contacts: [{ email: "a@b.com", firstName: "Ada", lastName: "Lovelace", tags: ["vip"] }],
      updateExisting: true,
    });

    const { resolveTool } = await import("../../src/registry.js");
    const rowProps = (resolveTool("import_contacts")!.inputSchema.properties!.contacts as {
      items: { properties: Record<string, unknown> };
    }).items.properties;
    expect(rowProps).not.toHaveProperty("company");
  });
});

describe("create_ab_test flat shape", () => {
  it("sends a single flat variant, not an array", async () => {
    const fetchMock = mockFetchOnce();
    await dispatch(
      "create_ab_test",
      {
        campaign_id: "camp_1",
        variant: "A",
        test_type: "subject",
        subject: "Subject A",
        send_percent: 50,
        auto_select_winner: true,
        winner_wait_hours: 8,
      },
      ctx,
      allowAll,
    );
    const body = sentBody(fetchMock);
    expect(body).toMatchObject({
      campaign_id: "camp_1",
      variant: "A",
      test_type: "subject",
      subject: "Subject A",
      send_percent: 50,
      auto_select_winner: true,
      winner_wait_hours: 8,
    });
    expect(body).not.toHaveProperty("variants");
    expect(body).not.toHaveProperty("type");
    expect(body).not.toHaveProperty("sample_percentage");
    expect(body).not.toHaveProperty("winner_metric");
  });

  it("only requires campaign_id and variant", async () => {
    const { resolveTool } = await import("../../src/registry.js");
    expect(resolveTool("create_ab_test")!.inputSchema.required).toEqual(["campaign_id", "variant"]);
  });
});

describe("select_ab_test_winner metric enum", () => {
  it("advertises the API's real metric values", async () => {
    const { resolveTool } = await import("../../src/registry.js");
    const metricProp = resolveTool("select_ab_test_winner")!.inputSchema.properties!.metric as {
      enum: string[];
    };
    expect(metricProp.enum).toEqual(["opens", "clicks", "revenue", "conversions"]);
  });
});

describe("list_ab_tests type filter", () => {
  it("advertises the API's real type values (campaign|subject)", async () => {
    const { resolveTool } = await import("../../src/registry.js");
    const typeProp = resolveTool("list_ab_tests")!.inputSchema.properties!.type as { enum: string[] };
    expect(typeProp.enum).toEqual(["campaign", "subject"]);
  });
});

describe("create_automation body mapping", () => {
  it("sends trigger_type instead of trigger, with no steps/active", async () => {
    const fetchMock = mockFetchOnce();
    await dispatch(
      "create_automation",
      { name: "Welcome series", trigger: "contact_created", trigger_config: { tag: "trial" } },
      ctx,
      allowAll,
    );
    const body = sentBody(fetchMock);
    expect(body).toEqual({
      name: "Welcome series",
      trigger_type: "contact_created",
      trigger_config: { tag: "trial" },
    });
    expect(body).not.toHaveProperty("trigger");
    expect(body).not.toHaveProperty("steps");
    expect(body).not.toHaveProperty("active");

    const { resolveTool } = await import("../../src/registry.js");
    const props = resolveTool("create_automation")!.inputSchema.properties!;
    expect(props).not.toHaveProperty("steps");
    expect(props).not.toHaveProperty("active");
  });
});

describe("create_landing_page block translation", () => {
  it("translates flat inputs into a single hero block under title/slug/blocks", async () => {
    const fetchMock = mockFetchOnce();
    await dispatch(
      "create_landing_page",
      { name: "Spring Sale", headline: "50% off", subheadline: "This week only", cta_text: "Shop now", slug: "spring-sale" },
      ctx,
      allowAll,
    );
    const body = sentBody(fetchMock) as {
      title: string;
      slug: string;
      blocks: { id: string; type: string; content: Record<string, unknown> }[];
    };
    expect(body.title).toBe("Spring Sale");
    expect(body.slug).toBe("spring-sale");
    expect(body.blocks).toHaveLength(1);
    expect(body.blocks[0]!.type).toBe("hero");
    expect(body.blocks[0]!.content).toMatchObject({
      heading: "50% off",
      subheading: "This week only",
      cta_label: "Shop now",
    });
    expect(typeof body.blocks[0]!.id).toBe("string");
    expect(body).not.toHaveProperty("headline");
    expect(body).not.toHaveProperty("tags");
  });
});

describe("generate_subject_lines tone enum", () => {
  it("advertises the API's real tone values", async () => {
    const { resolveTool } = await import("../../src/registry.js");
    const toneProp = resolveTool("generate_subject_lines")!.inputSchema.properties!.tone as {
      enum: string[];
    };
    // "friendly" and "formal" 400 against the live schema; "casual" and
    // "informative" are the real accepted values.
    expect(toneProp.enum).toEqual(["professional", "casual", "urgent", "playful", "informative"]);
  });
});

describe("toggle_integration routing", () => {
  it("PATCHes the /toggle sub-route, not the bare [id] route (which has no PATCH handler)", async () => {
    const fetchMock = mockFetchOnce();
    await dispatch(
      "toggle_integration",
      { integration_id: "int_1", enabled: false },
      ctx,
      allowAll,
    );
    expect(sentUrl(fetchMock)).toBe("https://example.invalid/integrations/int_1/toggle");
    expect(sentBody(fetchMock)).toEqual({ enabled: false });
  });
});

describe("configure_inbound_domain routing and required fields", () => {
  it("posts to the versioned /inbound route (no non-versioned /api/inbound route exists)", async () => {
    const fetchMock = mockFetchOnce();
    await dispatch(
      "configure_inbound_domain",
      { domain: "example.com", subdomain: "reply", webhook_url: "https://example.com/hook" },
      ctx,
      allowAll,
    );
    // ctx.baseUrl already ends in /v1 — apiFetch (not apiFetchRoot) is correct here.
    expect(sentUrl(fetchMock)).toBe("https://example.invalid/v1/inbound");
    const body = sentBody(fetchMock);
    expect(body).toEqual({
      domain: "example.com",
      subdomain: "reply",
      webhook_url: "https://example.com/hook",
    });
  });

  it("requires webhook_url, which the live schema mandates", async () => {
    const { resolveTool } = await import("../../src/registry.js");
    expect(resolveTool("configure_inbound_domain")!.inputSchema.required).toEqual([
      "domain",
      "subdomain",
      "webhook_url",
    ]);
  });
});
