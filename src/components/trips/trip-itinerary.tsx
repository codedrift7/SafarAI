"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, LoaderCircle, MapPin, MessageCircle, Plus, Send, Share2, Sparkles, X } from "lucide-react";
import type { Activity, Advisory, ChatMessage, Trip, TripDay } from "@/lib/domain/types";
import { addActivity, deleteActivity, exportTrip, reorderActivities, sendChatMessage, setTripPublic } from "@/lib/api";
import { useTripStore } from "@/stores/trip-store";
import { TripMap } from "@/components/maps/trip-map";
import { KarakoramLine } from "@/components/trips/karakoram-line";
import { ActivityIcon } from "@/components/trips/activity-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function formatDay(date: string) { return new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" }).format(new Date(date)); }

export function TripItinerary({ initialTrip, initialMessages, initialAdvisories, readOnly = false }: { initialTrip: Trip; initialMessages?: ChatMessage[]; initialAdvisories?: Advisory[]; readOnly?: boolean }) {
  const [trip, setTrip] = useState(initialTrip);
  const [activeDayNumber, setActiveDayNumber] = useState(initialTrip.days[0]?.dayNumber ?? 1);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages ?? []);
  const [advisories, setAdvisories] = useState<Advisory[]>(initialAdvisories ?? []);
  const [chatValue, setChatValue] = useState("");
  const [sending, setSending] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newStop, setNewStop] = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(initialTrip.isPublic && initialTrip.shareToken ? `/share/${initialTrip.shareToken}` : null);
  const setStoreTrip = useTripStore((state) => state.setTrip);
  const setStoreMessages = useTripStore((state) => state.setChatMessages);
  const activeDay = trip.days.find((day) => day.dayNumber === activeDayNumber) ?? trip.days[0];
  const orderedMessages = useMemo(() => [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()), [messages]);

  useEffect(() => { setStoreTrip(trip); setStoreMessages(messages); }, [trip, messages, setStoreTrip, setStoreMessages]);

  const replaceDay = (nextDay: TripDay) => setTrip((current) => ({ ...current, days: current.days.map((day) => day.id === nextDay.id ? nextDay : day) }));
  const handleMove = async (activity: Activity, direction: -1 | 1) => {
    if (!activeDay || readOnly) return;
    const ordered = [...activeDay.activities].sort((a, b) => a.orderIndex - b.orderIndex);
    const from = ordered.findIndex((item) => item.id === activity.id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= ordered.length) return;
    [ordered[from], ordered[to]] = [ordered[to], ordered[from]];
    const withOrder = ordered.map((item, index) => ({ ...item, orderIndex: index }));
    replaceDay({ ...activeDay, activities: withOrder });
    try { await reorderActivities(activeDay.id, withOrder.map((item) => item.id)); } catch { replaceDay(activeDay); }
  };
  const handleDelete = async (activity: Activity) => {
    if (!activeDay || readOnly) return;
    const previous = activeDay;
    replaceDay({ ...activeDay, activities: activeDay.activities.filter((item) => item.id !== activity.id) });
    setAdvisories((items) => items.filter((item) => item.activityId !== activity.id));
    try { await deleteActivity(activity.id); } catch { replaceDay(previous); }
  };
  const handleAdd = async (event: FormEvent) => {
    event.preventDefault(); if (!activeDay || !newStop.trim() || readOnly) return;
    setAdding(true);
    try { const activity = await addActivity({ tripDayId: activeDay.id, customTitle: newStop.trim(), category: "SIGHTSEEING", startTime: "16:00", endTime: "17:00", notes: "A custom stop — verify details before you go." }); replaceDay({ ...activeDay, activities: [...activeDay.activities, activity] }); setNewStop(""); } finally { setAdding(false); }
  };
  const handleChat = async (event: FormEvent) => {
    event.preventDefault(); if (!chatValue.trim() || sending || readOnly) return;
    const input = chatValue.trim(); setChatValue(""); setSending(true);
    const provisional: ChatMessage = { id: `local-${Date.now()}`, tripId: trip.id, role: "user", content: input, createdAt: new Date().toISOString() };
    setMessages((items) => [...items, provisional]);
    try {
      const stream = await sendChatMessage({ tripId: trip.id, content: input });
      for await (const event of stream) {
        if (event.type === "message") setMessages((items) => items.some((item) => item.id === event.message.id || (event.message.role === "user" && item.content === event.message.content)) ? items : [...items, event.message]);
        if (event.type === "activity-updated") setTrip((current) => ({ ...current, days: current.days.map((day) => day.id === event.activity.tripDayId ? { ...day, activities: day.activities.map((activity) => activity.id === event.activity.id ? event.activity : activity) } : day) }));
        if (event.type === "complete") { setTrip(event.trip); setMessages((items) => items.some((item) => item.id === event.message.id) ? items : [...items, event.message]); }
      }
    } finally { setSending(false); }
  };
  const share = async () => { const next = await setTripPublic(trip.id, true); setTrip(next); if (next.shareToken) { const url = `${window.location.origin}/share/${next.shareToken}`; setShareUrl(`/share/${next.shareToken}`); try { await navigator.clipboard.writeText(url); } catch {} } };
  const download = async () => { const exportData = await exportTrip(trip.id); const url = URL.createObjectURL(new Blob([exportData.content], { type: exportData.mimeType })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = exportData.filename; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url); };

  return <section className="bg-sandstone-mist"><div className="border-b border-karakoram-ink/10 bg-white px-4 py-4 sm:px-6 lg:px-8"><div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><Link href="/trips" className="grid size-9 shrink-0 place-items-center rounded-full text-karakoram-ink/65 hover:bg-sandstone-mist" aria-label="Back to trips"><ArrowLeft size={18} /></Link><div className="min-w-0"><p className="truncate text-xs font-bold uppercase tracking-[.12em] text-truck-art-marigold">{readOnly ? "Shared itinerary · read only" : "Your trip"}</p><h1 className="display-type truncate text-2xl leading-tight sm:text-3xl">{trip.title}</h1></div></div><div className="flex items-center gap-2">{!readOnly && <Button onClick={share} size="sm" variant="secondary"><Share2 size={15} /> Share</Button>}<Button onClick={download} size="sm" variant="secondary"><Download size={15} /> Export</Button></div></div></div>{shareUrl && <div className="border-b border-attabad-turquoise/20 bg-attabad-turquoise/8 px-4 py-2 text-center text-xs text-[#155367]">Share link is ready{!readOnly && ": copied to your clipboard"}. <Link href={shareUrl} className="font-bold underline underline-offset-2">Open read-only view</Link></div>}<div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8"><div className="min-w-0"><div className="rounded-[1.4rem] bg-karakoram-ink p-5 text-sandstone-mist sm:p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-2"><Badge variant="marigold">{trip.travelerType.toLowerCase()}</Badge><Badge variant="marigold">{trip.pace} pace</Badge>{trip.budgetTier && <Badge variant="marigold">{trip.budgetTier.replace("_", " ")}</Badge>}</div><p className="mt-4 max-w-xl text-sm leading-6 text-sandstone-mist/72">{trip.vibe ?? "A thoughtful route through real places."}</p></div><div className="rounded-xl border border-white/12 bg-white/6 px-3 py-2 text-xs text-sandstone-mist/72"><span className="mono-type text-truck-art-marigold">{new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(trip.startDate))}</span> → <span className="mono-type text-truck-art-marigold">{new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(trip.endDate))}</span></div></div></div><div className="mt-5 rounded-[1.4rem] border border-karakoram-ink/12 bg-white p-3 sm:p-4"><div className="flex items-center justify-between gap-3 px-2 pb-3"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-truck-art-marigold">Today’s leg</p><h2 className="display-type mt-1 text-2xl">Day {activeDay?.dayNumber ?? "—"}</h2></div><span className="inline-flex items-center gap-1.5 text-xs font-medium text-karakoram-ink/56"><MapPin size={14} className="text-attabad-turquoise" /> {activeDay?.region?.name ?? "Pakistan"}</span></div><div className="mb-4 flex gap-2 overflow-x-auto border-y border-karakoram-ink/8 py-3" role="tablist" aria-label="Itinerary days">{trip.days.map((day) => <button role="tab" aria-selected={day.dayNumber === activeDay?.dayNumber} key={day.id} onClick={() => setActiveDayNumber(day.dayNumber)} className={`min-w-[92px] rounded-xl px-3 py-2 text-left text-xs transition ${day.dayNumber === activeDay?.dayNumber ? "bg-attabad-turquoise text-white" : "text-karakoram-ink/62 hover:bg-sandstone-mist"}`}><span className="block font-bold">Day {day.dayNumber}</span><span className="mt-1 block opacity-75">{formatDay(day.date)}</span></button>)}</div><TripMap day={activeDay} /></div><div className="mt-5 rounded-[1.4rem] border border-karakoram-ink/12 bg-sandstone-mist/70 p-4 sm:p-6"><div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-truck-art-marigold">The Karakoram Line</p><h2 className="display-type mt-1 text-3xl">A day in sequence.</h2></div><p className="max-w-xs text-sm leading-5 text-karakoram-ink/60">A route line for the things that happen in order, not just the places you pin.</p></div>{activeDay ? <KarakoramLine activities={activeDay.activities} advisories={advisories} onMove={readOnly ? undefined : handleMove} onDelete={readOnly ? undefined : handleDelete} /> : <p className="py-10 text-center text-karakoram-ink/60">No days are ready yet.</p>}{!readOnly && <form onSubmit={handleAdd} className="mt-2 flex flex-col gap-2 rounded-xl border border-dashed border-karakoram-ink/22 bg-white p-3 sm:flex-row"><label className="sr-only" htmlFor="custom-stop">Add a custom stop</label><input id="custom-stop" value={newStop} onChange={(event) => setNewStop(event.target.value)} className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm outline-none" placeholder="Add a custom stop to this day…" /><Button type="submit" size="sm" disabled={adding || !newStop.trim()}>{adding ? <LoaderCircle className="animate-spin" size={15} /> : <Plus size={15} />} Add stop</Button></form>}</div></div>{!readOnly && 
  <aside className="flex min-h-0 flex-col overflow-hidden rounded-[1.4rem] border border-karakoram-ink/12 bg-white lg:sticky lg:top-[88px] lg:h-[calc(100vh-110px)] lg:max-h-[800px]">
  <div className="shrink-0 border-b border-karakoram-ink/10 p-5">
    <div className="flex items-center gap-2">
      <span className="grid size-8 place-items-center rounded-xl bg-attabad-turquoise/12 text-attabad-turquoise">
        <Sparkles size={17} />
      </span>

      <div>
        <h2 className="font-bold">Ask Safar</h2>
        <p className="text-xs text-karakoram-ink/58">
          Try “swap a fort for something outdoors”.
        </p>
      </div>
    </div>
  </div>

  <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
    {orderedMessages.length === 0 && (
      <div className="rounded-xl bg-sandstone-mist p-4 text-sm leading-6 text-karakoram-ink/70">
        Want a slower morning, more food, or a different kind of stop?
        Tell me what you’re after.
      </div>
    )}

    {orderedMessages.map((message) => (
      <div
        key={message.id}
        className={`flex ${
          message.role === "user" ? "justify-end" : "justify-start"
        }`}
      >
        <p
          className={`max-w-[88%] rounded-2xl px-3 py-2.5 text-sm leading-5 ${
            message.role === "user"
              ? "bg-karakoram-ink text-sandstone-mist"
              : "bg-sandstone-mist text-karakoram-ink"
          }`}
        >
          {message.content}
        </p>
      </div>
    ))}

    {sending && (
      <div className="flex items-center gap-2 text-xs text-karakoram-ink/60">
        <LoaderCircle
          className="animate-spin text-attabad-turquoise"
          size={15}
        />
        Safar is adjusting your route…
      </div>
    )}
  </div>

  <form
    onSubmit={handleChat}
    className="shrink-0 border-t border-karakoram-ink/10 bg-white p-3"
  >
    <label className="sr-only" htmlFor="chat-edit">
      Ask Safar to edit your itinerary
    </label>

    <div className="flex items-end gap-2 rounded-xl border border-karakoram-ink/14 bg-sandstone-mist/50 p-2">
      <textarea
        id="chat-edit"
        value={chatValue}
        onChange={(event) => setChatValue(event.target.value)}
        className="min-h-10 max-h-24 min-w-0 flex-1 resize-none bg-transparent px-1 py-2 text-sm outline-none"
        placeholder="Change this route…"
      />

      <button
        type="submit"
        disabled={!chatValue.trim() || sending}
        className="grid size-9 shrink-0 place-items-center rounded-lg bg-attabad-turquoise text-white disabled:opacity-45"
        aria-label="Send message"
      >
        <Send size={16} />
      </button>
    </div>
  </form>
</aside>}</div></section>;
}
