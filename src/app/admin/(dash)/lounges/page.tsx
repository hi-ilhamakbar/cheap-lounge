import { prisma } from "@/lib/db";
import { providerMode } from "@/lib/lounges/service";
import { ActionForm } from "../ActionForm";
import { saveLoungeAction, toggleLoungeAction } from "../../actions";

/**
 * Only used when LOUNGE_PROVIDER=database: admins enter lounges copied from an AUTHORIZED LoungeKey
 * source (e.g. the LoungeKey Pass Agent Web Portal). Never invent or guess data — leave unknown
 * fields empty so customers see "Information unavailable".
 */
export default async function AdminLoungesPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const mode = providerMode();
  const lounges = await prisma.lounge.findMany({ where: { source: "MANUAL" }, orderBy: [{ airportIata: "asc" }, { name: "asc" }] });
  const editing = edit ? lounges.find((l) => l.id === edit) : undefined;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Lounges (manual source)</h1>
      {mode !== "database" && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          LOUNGE_PROVIDER is “{mode}”. Manually entered lounges are only shown to customers when LOUNGE_PROVIDER=database.
        </p>
      )}
      <p className="text-sm text-slate-600">
        Enter only information copied from an authorized LoungeKey source. Leave fields empty when the source does not provide them.
      </p>

      <div className="card p-5">
        <h2 className="mb-4 font-semibold">{editing ? `Edit: ${editing.name}` : "Add lounge"}</h2>
        <ActionForm action={saveLoungeAction} submitLabel={editing ? "Save changes" : "Add lounge"}>
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <div className="grid gap-3 md:grid-cols-3">
            <input name="airportIata" required maxLength={3} placeholder="Airport IATA (e.g. CGK)" defaultValue={editing?.airportIata} className="field-input py-2 text-sm uppercase" />
            <input name="externalId" required placeholder="LoungeKey reference / ID" defaultValue={editing?.externalId} className="field-input py-2 text-sm" />
            <input name="name" required placeholder="Lounge name" defaultValue={editing?.name} className="field-input py-2 text-sm" />
            <input name="terminal" placeholder="Terminal" defaultValue={editing?.terminal ?? ""} className="field-input py-2 text-sm" />
            <input name="location" placeholder="Location (airside/landside, directions)" defaultValue={editing?.location ?? ""} className="field-input py-2 text-sm md:col-span-2" />
          </div>
          <textarea name="openingHours" rows={2} placeholder="Opening hours" defaultValue={editing?.openingHours ?? ""} className="field-input py-2 text-sm" />
          <textarea name="description" rows={3} placeholder="Description" defaultValue={editing?.description ?? ""} className="field-input py-2 text-sm" />
          <textarea name="facilities" rows={2} placeholder="Facilities — one per line or comma separated" defaultValue={editing?.facilities.join("\n")} className="field-input py-2 text-sm" />
          <textarea name="conditions" rows={2} placeholder="Access restrictions & conditions" defaultValue={editing?.conditions ?? ""} className="field-input py-2 text-sm" />
          <textarea name="accessInfo" rows={2} placeholder="Booking / access information" defaultValue={editing?.accessInfo ?? ""} className="field-input py-2 text-sm" />
          <textarea name="images" rows={2} placeholder="Image URLs (https://…), space or line separated — only images you are licensed to use" defaultValue={editing?.images.join("\n")} className="field-input py-2 text-sm" />
        </ActionForm>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="bg-navy-50 text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-3">Airport</th><th className="px-4 py-3">Lounge</th><th className="px-4 py-3">Terminal</th><th className="px-4 py-3">Ref</th><th className="px-4 py-3">Active</th><th className="px-4 py-3" /></tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {lounges.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-3 font-semibold">{l.airportIata}</td>
                <td className="px-4 py-3">{l.name}</td>
                <td className="px-4 py-3">{l.terminal ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs">{l.externalId}</td>
                <td className="px-4 py-3">{l.active ? "Yes" : "No"}</td>
                <td className="flex gap-2 px-4 py-3">
                  <a href={`/admin/lounges?edit=${l.id}`} className="btn-ghost px-3 py-1 text-xs">Edit</a>
                  <form action={toggleLoungeAction}>
                    <input type="hidden" name="id" value={l.id} />
                    <button className="btn-ghost px-3 py-1 text-xs">{l.active ? "Deactivate" : "Activate"}</button>
                  </form>
                </td>
              </tr>
            ))}
            {lounges.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No manual lounges yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
