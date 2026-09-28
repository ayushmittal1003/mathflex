import { bunnyConfigured } from "@/lib/video";
import { requireStaff } from "@/lib/auth";
import { Card, PageHeader, Badge } from "@/components/admin/ui";

export const metadata = { title: "Video hosting" };

const OPTIONS = [
  {
    name: "Bunny Stream",
    tag: "Recommended",
    tone: "ok" as const,
    cost: "Pay-as-you-go: roughly $0.01/GB-month storage + $0.005–0.03/GB delivery (check bunny.net/pricing)",
    pros: ["Token-signed private playback — links expire, can't be shared", "Auto-encodes to adaptive HLS (smooth on 4G phones)", "Upload straight from this admin panel", "Built-in DRM available when you need it"],
    cons: ["Small monthly bill"],
  },
  {
    name: "VdoCipher",
    tag: "When piracy becomes a problem",
    tone: "gold" as const,
    cost: "Annual plans — noticeably costlier than Bunny (check vdocipher.com/pricing)",
    pros: ["Hollywood-grade DRM + dynamic watermark with student's phone/email", "Blocks screen recording on most devices", "Used by many Indian edtech companies"],
    cons: ["Costly for a new platform", "Needs a small integration change (their OTP API)"],
  },
  {
    name: "AWS (S3 + CloudFront + MediaConvert)",
    tag: "Only with a DevOps person",
    tone: "muted" as const,
    cost: "Pay-per-use; similar to Bunny but more moving parts",
    pros: ["Full control, scales infinitely"],
    cons: ["You must set up encoding pipelines, signed cookies, CDN", "Egress pricing is the most expensive of the three"],
  },
  {
    name: "YouTube (unlisted)",
    tag: "Not recommended for paid content",
    tone: "bad" as const,
    cost: "Free",
    pros: ["Zero cost, great player"],
    cons: [
      "“Private” videos can't be embedded at all — only unlisted works, and anyone with the link can watch & share it",
      "YouTube branding and ‘watch on YouTube’ links leave your site",
      "Charging for access to YouTube-hosted videos may conflict with YouTube's Terms of Service",
      "Can't reliably track watch-time for part unlocks",
    ],
  },
];

export default async function VideoHosting() {
  await requireStaff("video");
  const ok = bunnyConfigured();
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Video hosting" subtitle="Where lecture videos live. Each part can use a different provider, so you can switch any time." />
      <Card>
        <div className="flex items-center gap-3">
          <span className={`size-3 rounded-full ${ok ? "bg-ok" : "bg-gold"}`} />
          <p className="text-sm">{ok ? "Bunny Stream is connected. Upload videos from any chapter's Parts tab." : "Bunny Stream isn't connected yet. Follow the steps below (≈10 minutes)."}</p>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {OPTIONS.map((o) => (
          <Card key={o.name}>
            <div className="flex items-start justify-between gap-2"><h2 className="font-bold">{o.name}</h2><Badge tone={o.tone}>{o.tag}</Badge></div>
            <p className="mt-1 text-xs text-muted">{o.cost}</p>
            <ul className="mt-3 space-y-1 text-sm">
              {o.pros.map((p) => <li key={p} className="flex gap-2"><span className="text-ok">✓</span>{p}</li>)}
              {o.cons.map((p) => <li key={p} className="flex gap-2 text-muted"><span className="text-bad">✕</span>{p}</li>)}
            </ul>
          </Card>
        ))}
      </div>
      <Card title="Connect Bunny Stream">
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          <li>Create an account at <b>bunny.net</b> → <b>Stream</b> → <b>Add Video Library</b> (pick Asia/Mumbai replication for Indian students).</li>
          <li>Library → <b>API</b>: copy the <b>Library ID</b> and <b>API Key</b>.</li>
          <li>Library → <b>Security</b>: turn on <b>Embed view token authentication</b>, copy the <b>Token Authentication Key</b>, and add <code>mathflex.in</code> to <b>Allowed domains</b>.</li>
          <li>Add to the server environment and redeploy:
            <pre className="mt-2 rounded-xl bg-surface-2 p-3 text-xs">{`BUNNY_LIBRARY_ID=...\nBUNNY_API_KEY=...\nBUNNY_TOKEN_KEY=...`}</pre>
          </li>
          <li>Open any chapter → Parts → choose <b>Bunny Stream</b> → upload the file. Duration fills in automatically once encoded.</li>
        </ol>
      </Card>
    </div>
  );
}
