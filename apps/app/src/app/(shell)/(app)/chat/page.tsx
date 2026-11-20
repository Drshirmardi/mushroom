'use client';

import {
  AttachmentPicker,
  ChatAttachmentCard,
  ChatCallCard,
  PreviousVisitMessages,
} from '@sabz-zendegi/api-client/chat-ui';
import { HeartbeatLoader } from '@/components/shared/heartbeat-loader';
import { LoadingState } from '@/components/shared/skeletons';

import Link from 'next/link';
import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  MessageCircle,
  CalendarDays,
  Check,
  ChevronDown,
  MoreVertical,
  Phone,
  Send,
  CheckCircle2,
} from 'lucide-react';
import { DoctorPortrait } from '@/components/booking/doctor-portrait';
import { useAuthSession } from '@/components/auth/session-gate';
import {
  chatEngine,
  connectChat,
  loadChat,
  loadOlderChat,
  reconcileChatMessages,
  chatAccessLabel,
  type ChatAccess,
  type ChatConnection,
  type ChatMessage,
} from '@/lib/chat-api';

import { listPatientAppointments } from '@/lib/appointment-api';
import { getPatientDoctor } from '@/lib/directory-api';
import { usePatientResource } from '@/lib/use-patient-resource';
import { ServicePage, ServiceSection, ServiceEmpty } from '@/components/shared/service-page';
import { PatientResourceState } from '@/components/shared/patient-resource-state';
import { useUiStore } from '@/stores/ui';

type LoadedChat = Awaited<ReturnType<typeof loadChat>>;
type ConnectionState =
  'loading' | 'connected' | 'reconnecting' | 'offline' | 'read-only' | 'recovery-failed';

function canGroupChatMessages(first: ChatMessage, second: ChatMessage) {
  const isBubble = (message: ChatMessage) =>
    message.visibility === 'VISIBLE' && !message.callId && Boolean(message.body || message.attachment);
  return (
    isBubble(first) &&
    isBubble(second) &&
    first.senderKind === second.senderKind &&
    dateKey(first.createdAt) === dateKey(second.createdAt) &&
    Math.abs(new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()) <= 120_000
  );
}

const dateKey = (value: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }).format(new Date(value));
const dateLabel = (value: string) =>
  new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeZone: 'Asia/Tehran' }).format(
    new Date(value),
  );
const timeLabel = (value: string) =>
  new Intl.DateTimeFormat('fa-IR', { timeStyle: 'short', timeZone: 'Asia/Tehran' }).format(
    new Date(value),
  );

function ChatAppointments() {
  const { authentication } = useAuthSession();
  const resource = usePatientResource(
    useCallback(
      () => listPatientAppointments(authentication.accessToken),
      [authentication.accessToken],
    ),
  );
  const items = resource.data?.items.filter(
    (item) =>
      item.visitMode === 'ONLINE' &&
      ['CONFIRMED', 'CHECKED_IN', 'QUEUED', 'IN_PROGRESS', 'COMPLETED'].includes(item.status),
  );
  return (
    <ServicePage
      title="گفتگو با پزشک"
      description="برای ورود به گفتگو، نوبت مربوط را انتخاب کنید. دسترسی و زمان مجاز گفتگو هنگام ورود بررسی می‌شود."
      icon={MessageCircle}
    >
      <p className="service-note">
        گفتگو به نوبت مشخص شما متصل است. پیام‌ها و وضعیت اتصال پس از ورود نمایش داده می‌شوند.
      </p>
      <ServiceSection title="انتخاب نوبت برای گفتگو">
        <PatientResourceState {...resource} retry={() => void resource.reload()} />
        {items?.map((item) => (
          <Link
            key={item.id}
            href={`/chat?appointmentId=${encodeURIComponent(item.id)}`}
            className="service-card"
          >
            <h3>
              {new Intl.DateTimeFormat('fa-IR', {
                dateStyle: 'medium',
                timeStyle: 'short',
                timeZone: 'Asia/Tehran',
              }).format(new Date(item.startsAt))}
            </h3>
            <span className="service-text-action">
              بررسی و ورود به گفتگو
              <ArrowLeft size={17} aria-hidden="true" />
            </span>
          </Link>
        ))}
        {items?.length === 0 && (
          <ServiceEmpty
            icon={MessageCircle}
            title="گفتگویی برای ورود ندارید"
            description="در حال حاضر نوبت جاری یا تأییدشده‌ای برای گفتگو پیدا نشد. نوبت‌های خود را بررسی کنید یا مشاورهٔ جدیدی رزرو کنید."
            href="/appointments"
            action="مشاهدهٔ نوبت‌های من"
          />
        )}
      </ServiceSection>
      <Link href="/appointments/book" className="service-callout">
        <CalendarDays size={24} aria-hidden="true" />
        <div>
          <h2>نیاز به مشاوره دارید؟</h2>
          <p>پزشک و زمان مناسب را انتخاب کنید</p>
        </div>
        <ArrowLeft size={18} aria-hidden="true" />
      </Link>
    </ServicePage>
  );
}

function ChatRoute() {
  const id = useSearchParams().get('appointmentId');
  return id ? <ChatRoom key={id} appointmentId={id} /> : <ChatAppointments />;
}

export default function ChatPage() {
  return (
    <Suspense fallback={<LoadingState variant="chat" className="p-4" />}>
      <ChatRoute />
    </Suspense>
  );
}

function ChatRoom({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const { authentication } = useAuthSession();
  const [chat, setChat] = useState<LoadedChat | null>(null);
  const [doctorName, setDoctorName] = useState('');
  const [doctorImageUrl, setDoctorImageUrl] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionState>('loading');
  const [access, setAccess] = useState<ChatAccess | null>(null);
  const [sending, setSending] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const transport = useRef<ChatConnection | null>(null);
  const sendLock = useRef(false);
  const pending = useRef<{
    conversationId: string;
    body: string;
    id: string;
    composerRect: DOMRect | null;
  } | null>(null);
  const room = useRef<HTMLDivElement | null>(null);
  const scroll = useRef<HTMLElement | null>(null);
  const scrollFrame = useRef(0);
  const lastAutoScrollMessages = useRef<ChatMessage[] | null>(null);
  const composer = useRef<HTMLTextAreaElement | null>(null);
  const composing = useRef(false);
  const follow = useRef(true);
  const pendingPrepend = useRef<{ conversationId: string; height: number } | null>(null);
  const conversationEpoch = useRef(0);
  const knownMessageIds = useRef(new Set<string>());
  const [enteringMessageIds, setEnteringMessageIds] = useState<Set<string>>(() => new Set());
  const messageElements = useRef(new Map<string, HTMLDivElement>());
  const outgoingMessageOrigins = useRef(new Map<string, DOMRect>());
  const startedOutgoingAnimations = useRef(new Set<string>());

  const trackNewMessage = (message: ChatMessage) => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pendingMessage = pending.current;
    if (
      !reduceMotion &&
      message.senderKind === 'PATIENT' &&
      pendingMessage !== null &&
      pendingMessage.body === message.body &&
      pendingMessage.composerRect
    ) {
      outgoingMessageOrigins.current.set(message.id, pendingMessage.composerRect);
    }
    if (knownMessageIds.current.has(message.id)) return;
    knownMessageIds.current.add(message.id);
    if (reduceMotion) return;
    setEnteringMessageIds((current) => new Set(current).add(message.id));
  };

  const finishMessageEntry = (messageId: string) => {
    setEnteringMessageIds((current) => {
      if (!current.has(messageId)) return current;
      const next = new Set(current);
      next.delete(messageId);
      return next;
    });
  };

  useLayoutEffect(() => {
    const messages = chat?.messages ?? null;
    if (messages !== lastAutoScrollMessages.current) {
      lastAutoScrollMessages.current = messages;
      if (follow.current && scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
    }
    for (const [messageId, origin] of outgoingMessageOrigins.current) {
      if (startedOutgoingAnimations.current.has(messageId)) continue;
      const element = messageElements.current.get(messageId);
      if (!element) continue;
      const target = element.getBoundingClientRect();
      const offsetX = origin.left + origin.width / 2 - (target.left + target.width / 2);
      const offsetY = origin.top + origin.height / 2 - (target.top + target.height / 2);
      if (typeof element.animate !== 'function') {
        outgoingMessageOrigins.current.delete(messageId);
        finishMessageEntry(messageId);
        continue;
      }
      startedOutgoingAnimations.current.add(messageId);
      const animation = element.animate(
        [
          { opacity: 0.45, transform: `translate3d(${offsetX}px, ${offsetY}px, 0) scale(0.92)` },
          { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' },
        ],
        { duration: 340, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      );
      animation.onfinish = () => {
        outgoingMessageOrigins.current.delete(messageId);
        startedOutgoingAnimations.current.delete(messageId);
        finishMessageEntry(messageId);
      };
    }
  }, [chat?.messages, enteringMessageIds]);

  // Hide the bottom navigation only while a conversation is open.
  useEffect(() => {
    useUiStore.getState().setImmersive(true);
    return () => useUiStore.getState().setImmersive(false);
  }, []);

  // Keep the room inside the visual viewport while the user's keyboard is open.
  useEffect(() => {
    const element = room.current;
    if (!element) return;
    const viewport = window.visualViewport;
    let frame = 0;
    const apply = () => {
      frame = 0;
      if (!element.isConnected) return;
      const height = viewport?.height ?? window.innerHeight;
      const top = Math.max(0, viewport?.offsetTop ?? 0);
      const nextHeight = `${height}px`;
      const nextTransform = top === 0 ? '' : `translateY(${top}px)`;
      if (element.style.height !== nextHeight) element.style.height = nextHeight;
      if (element.style.transform !== nextTransform) element.style.transform = nextTransform;
      const keyboard = height < window.innerHeight - 120 ? 'open' : 'closed';
      if (element.dataset.keyboard !== keyboard) element.dataset.keyboard = keyboard;
    };
    const update = () => {
      if (frame === 0) frame = window.requestAnimationFrame(apply);
    };
    apply();
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      window.cancelAnimationFrame(frame);
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      element.style.removeProperty('height');
      element.style.removeProperty('transform');
      element.removeAttribute('data-keyboard');
    };
  }, []);

  useEffect(() => {
    let active = true;
    let handle: ChatConnection | undefined;
    conversationEpoch.current += 1;
    setChat(null);
    setAccess(null);
    setError(null);
    setConnection('loading');
    setLoadingOlder(false);
    pendingPrepend.current = null;
    knownMessageIds.current = new Set();
    setEnteringMessageIds(new Set());
    outgoingMessageOrigins.current.clear();
    startedOutgoingAnimations.current.clear();
    void loadChat(authentication.accessToken, appointmentId).then(
      (loaded) => {
        if (!active) return;
        follow.current = true;
        knownMessageIds.current = new Set(loaded.messages.map((message) => message.id));
        setChat(loaded);
        handle = connectChat(
          authentication.accessToken,
          loaded,
          (message) => {
            if (active) {
              trackNewMessage(message);
              setChat((current) =>
                current
                  ? { ...current, messages: reconcileChatMessages(current.messages, message) }
                  : current,
              );
            }
          },
          (state, availability) => {
            if (active) {
              setConnection(state);
              if (availability) setAccess(availability);
            }
          },
        );
        transport.current = handle;
      },
      () => {
        if (active) {
          setError('دریافت گفتگو ممکن نشد. دوباره تلاش کنید.');
          setConnection('recovery-failed');
        }
      },
    );
    return () => {
      active = false;
      handle?.disconnect();
      if (transport.current === handle) transport.current = null;
    };
  }, [appointmentId, authentication.accessToken, attempt]);

  useEffect(() => {
    const doctorId = chat?.conversation.doctorId;
    if (!doctorId) return;
    let active = true;
    void getPatientDoctor(authentication.accessToken, doctorId).then(
      (doctor) => {
        if (!active) return;
        setDoctorName(doctor.displayName.trim());
        setDoctorImageUrl(doctor.profileImageUrl ?? null);
      },
      () => {
        if (!active) return;
        setDoctorName('');
        setDoctorImageUrl(null);
      },
    );
    return () => {
      active = false;
    };
  }, [authentication.accessToken, chat?.conversation.doctorId]);

  useEffect(() => {
    return () => {
      if (scrollFrame.current) window.cancelAnimationFrame(scrollFrame.current);
    };
  }, []);

  useLayoutEffect(() => {
    const pending = pendingPrepend.current;
    if (!pending || !chat || chat.conversation.id !== pending.conversationId || !scroll.current)
      return;
    scroll.current.scrollTop += scroll.current.scrollHeight - pending.height;
    pendingPrepend.current = null;
  }, [chat?.messages, chat?.conversation.id]);

  useEffect(() => {
    const el = composer.current;
    if (el && !text) el.style.height = 'auto';
  }, [text]);

  const send = async () => {
    const handle = transport.current;
    if (!chat || !handle || !text.trim() || connection !== 'connected' || sendLock.current) return;
    const draft = text;
    const body = text.normalize('NFC').trim();
    const id = chat.conversation.id;
    if (Array.from(body).length > 4000) {
      setError('پیام باید حداکثر ۴۰۰۰ نویسه باشد.');
      return;
    }
    if (pending.current?.body !== body || pending.current.conversationId !== id)
      pending.current = {
        conversationId: id,
        body,
        id: crypto.randomUUID(),
        composerRect: composer.current?.getBoundingClientRect() ?? null,
      };
    sendLock.current = true;
    setSending(true);
    setError(null);
    try {
      const message = await handle.send(body, pending.current.id);
      if (transport.current !== handle) return;
      trackNewMessage(message);
      setChat((current) =>
        current?.conversation.id === id
          ? { ...current, messages: reconcileChatMessages(current.messages, message) }
          : current,
      );
      setText((current) => (current === draft ? '' : current));
      pending.current = null;
      follow.current = true;
      setAtBottom(true);
    } catch {
      if (transport.current === handle)
        setError('ارسال تأیید نشد؛ متن حفظ شده و می‌توانید دوباره ارسال کنید.');
    } finally {
      sendLock.current = false;
      setSending(false);
    }
  };
  const older = async () => {
    if (!chat?.olderCursor || loadingOlder) return;
    const id = chat.conversation.id;
    const epoch = conversationEpoch.current;
    setLoadingOlder(true);
    setError(null);
    follow.current = false;
    try {
      const page = await loadOlderChat(authentication.accessToken, id, chat.olderCursor);
      if (conversationEpoch.current !== epoch) return;
      for (const message of page.items) knownMessageIds.current.add(message.id);
      const height = scroll.current?.scrollHeight ?? 0;
      pendingPrepend.current = { conversationId: id, height };
      setChat((current) =>
        current?.conversation.id === id
          ? {
              ...current,
              messages: page.items.reduce(reconcileChatMessages, current.messages),
              olderCursor: page.nextCursor ?? null,
            }
          : current,
      );
    } catch {
      if (conversationEpoch.current === epoch) setError('دریافت پیام‌های قبلی ممکن نشد.');
    } finally {
      if (conversationEpoch.current === epoch) setLoadingOlder(false);
    }
  };

  const jumpToLatest = () => {
    follow.current = true;
    const el = scroll.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  };
  const onMessagesScroll = () => {
    if (scrollFrame.current) return;
    scrollFrame.current = window.requestAnimationFrame(() => {
      scrollFrame.current = 0;
      const el = scroll.current;
      if (!el) return;
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
      follow.current = nearBottom;
      setAtBottom((current) => (current === nearBottom ? current : nearBottom));
    });
  };
  const grow = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  };
  const onComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !composing.current &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      void send();
    }
  };

  const groups = useMemo(() => {
    const result: Array<{ key: string; label: string; items: ChatMessage[] }> = [];
    for (const message of chat?.messages ?? []) {
      const key = dateKey(message.createdAt);
      const last = result.at(-1);
      if (last?.key === key) last.items.push(message);
      else result.push({ key, label: dateLabel(message.createdAt), items: [message] });
    }
    return result;
  }, [chat?.messages]);

  const length = Array.from(text).length;
  const canSend = Boolean(chat) && connection === 'connected' && access?.canSend !== false;
  const stateLabel =
    connection === 'connected'
      ? 'متصل'
      : connection === 'reconnecting'
        ? 'در حال اتصال مجدد…'
        : connection === 'offline'
          ? 'آفلاین؛ در حال تلاش مجدد…'
          : connection === 'read-only'
            ? 'فقط‌خواندنی'
            : connection === 'recovery-failed'
              ? 'بازیابی گفتگو ناموفق بود'
              : 'در حال اتصال…';
  const dotTone =
    connection === 'connected'
      ? 'bg-emerald-500'
      : connection === 'recovery-failed'
        ? 'bg-red-500'
        : connection === 'read-only'
          ? 'bg-slate-400'
          : connection === 'loading'
            ? 'bg-slate-300'
            : 'bg-amber-500';
  const readOnlyNote = connection === 'read-only' ? chatAccessLabel(access) : null;
  const closedAt = chat?.conversation.closedAt ?? access?.closedAt ?? null;
  const isClosed = closedAt !== null;

  function renderMessage(
    message: ChatMessage,
    conversationId: string,
    previousMessage?: ChatMessage,
    nextMessage?: ChatMessage,
  ) {
    const isEntering = enteringMessageIds.has(message.id);
    const outgoingOrigin = outgoingMessageOrigins.current.has(message.id);
    const onEntryAnimationEnd = (event: React.AnimationEvent<HTMLElement>) => {
      if (event.target === event.currentTarget) finishMessageEntry(message.id);
    };
    const restricted =
      message.visibility === 'RESTRICTED' || (message.body === undefined && !message.attachment);
    if (restricted)
      return (
        <p
          key={message.id}
          onAnimationEnd={onEntryAnimationEnd}
          className={`mx-auto max-w-[85%] rounded-xl bg-white px-3 py-2 text-center text-[11px] text-muted-foreground ring-1 ring-border${isEntering ? ' chat-message-enter' : ''}`}
        >
          {message.tombstone ?? 'محتوای این پیام محدود شده است.'}
        </p>
      );
    if (message.callId)
      return (
        <div
          key={message.id}
          onAnimationEnd={onEntryAnimationEnd}
          className={`mx-auto w-[72%] max-w-sm${isEntering ? ' chat-message-enter' : ''}`}
        >
          <ChatCallCard
            engine={chatEngine}
            token={authentication.accessToken}
            conversationId={conversationId}
            id={message.callId}
            time={timeLabel(message.createdAt)}
            incoming={true}
          />
        </div>
      );
    const isOwn = message.senderKind === 'PATIENT';
    const groupedWithPrevious = Boolean(
      previousMessage && canGroupChatMessages(previousMessage, message),
    );
    const groupedWithNext = Boolean(nextMessage && canGroupChatMessages(message, nextMessage));
    const joinedCorner = isOwn
      ? groupedWithPrevious
        ? 'rounded-tr-md'
        : ''
      : groupedWithPrevious
        ? 'rounded-tl-md'
        : '';
    const tailCorner = isOwn
      ? groupedWithNext
        ? 'rounded-br-md'
        : 'rounded-br-[2px]'
      : groupedWithNext
        ? 'rounded-bl-md'
        : 'rounded-bl-[2px]';
    return (
      <div
        key={message.id}
        ref={(element) => {
          if (element) messageElements.current.set(message.id, element);
          else messageElements.current.delete(message.id);
        }}
        onAnimationEnd={onEntryAnimationEnd}
        className={`flex flex-col ${isOwn ? 'items-start' : 'items-end'}${groupedWithPrevious ? ' chat-message--joined' : ''}${isEntering ? (outgoingOrigin ? ' chat-message-fly' : ' chat-message-enter') : ''}`}
      >
        <div
          className={`chat-message-bubble relative max-w-[85%] rounded-2xl ${joinedCorner} ${tailCorner} px-3.5 py-2.5 text-base leading-[1.5] shadow-sm sm:max-w-[78%] sm:px-4 sm:py-3 ${isOwn ? 'bg-primary text-primary-foreground' : 'border border-[#292b2d] bg-[#090a0b] text-white'}`}
        >
          <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{message.body}</p>
          {message.attachment && (
            <ChatAttachmentCard
              engine={chatEngine}
              token={authentication.accessToken}
              conversationId={conversationId}
              message={message}
            />
          )}
          <div
            dir="ltr"
            className={`mt-1 flex items-center gap-2 text-[10px] leading-none ${isOwn ? 'justify-between text-primary-foreground/70' : 'justify-start text-muted-foreground'}`}
          >
            <time dateTime={message.createdAt}>{timeLabel(message.createdAt)}</time>
            {isOwn && <Check size={12} aria-hidden="true" />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={room}
      className="patient-chat-room group relative z-30 mx-auto flex h-full max-w-[720px] flex-col overflow-hidden bg-transparent"
    >
      <header dir="ltr" className="absolute inset-x-0 top-0 z-40 flex items-center gap-2 bg-transparent px-3 py-2.5">
        <button
          type="button"
          aria-label="بازگشت"
          onClick={() => router.back()}
          className="grid size-12 flex-shrink-0 place-items-center rounded-full border border-white/10 bg-[#090a0b]/75 text-white shadow-sm backdrop-blur-lg transition-colors hover:bg-[#202224]/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <ArrowLeft size={21} aria-hidden="true" />
        </button>
        <div dir="rtl" className="flex min-w-0 flex-1 items-center gap-2.5 rounded-full border border-white/10 bg-[#090a0b]/75 px-2 py-1.5 text-white shadow-sm backdrop-blur-lg">
          <DoctorPortrait
            name={doctorName || 'پزشک'}
            url={doctorImageUrl}
            token={authentication.accessToken}
            className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-muted object-cover text-sm font-bold text-primary"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">
              {doctorName || 'گفتگوی مشاوره'}
            </p>
            <p
              role="status"
              className="flex items-center gap-1.5 truncate text-[11px] text-white/70"
            >
              {connection === 'loading' || connection === 'reconnecting' ? (
                <HeartbeatLoader />
              ) : (
                <span
                  className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${dotTone}`}
                  aria-hidden="true"
                />
              )}
              {stateLabel}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 rounded-full border border-white/10 bg-[#090a0b]/75 p-1 text-white shadow-sm backdrop-blur-lg">
          <button
            type="button"
            disabled
            aria-label="تماس را پزشک آغاز می‌کند"
            title="تماس را پزشک آغاز می‌کند"
            className="grid size-11 place-items-center rounded-full text-primary opacity-55"
          >
            <Phone size={20} aria-hidden="true" />
          </button>
          <details className="relative">
            <summary
              aria-label="گزینه‌های گفتگو"
              title="گزینه‌ها"
              className="grid size-11 cursor-pointer list-none place-items-center rounded-full text-white transition-colors hover:bg-[#202224] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden"
            >
              <MoreVertical size={20} aria-hidden="true" />
            </summary>
            <div dir="rtl" className="absolute end-0 top-full z-50 mt-2 min-w-48 overflow-hidden rounded-2xl border border-border bg-card p-1.5 text-sm text-foreground shadow-lg">
              {chat?.conversation.doctorId && (
                <Link
                  href={`/doctors/${chat.conversation.doctorId}`}
                  className="block rounded-xl px-3 py-2.5 font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
                >
                  نمایهٔ پزشک
                </Link>
              )}
              {(connection === 'offline' || connection === 'recovery-failed' || connection === 'read-only') && (
                <button
                  type="button"
                  onClick={() => setAttempt((value) => value + 1)}
                  className="block w-full rounded-xl px-3 py-2.5 text-start font-medium text-primary hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
                >
                  بررسی دوبارهٔ اتصال
                </button>
              )}
            </div>
          </details>
        </div>
      </header>
      {readOnlyNote && !isClosed && (
        <p
          role="note"
          className="flex-shrink-0 border-b border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-900"
        >
          {readOnlyNote}
        </p>
      )}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <main
          ref={scroll}
          onScroll={onMessagesScroll}
          className="chat-scroll-rail patient-chat-wallpaper min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-3 pb-[calc(5rem+env(safe-area-inset-bottom))] [overflow-anchor:none]"
        >
          <div dir="rtl" className="min-h-full space-y-2">
            {chat && (
              <PreviousVisitMessages
                key={appointmentId}
                engine={chatEngine}
                token={authentication.accessToken}
                appointmentId={appointmentId}
                renderMessage={renderMessage}
                onLoadStart={() => {
                  follow.current = false;
                }}
              />
            )}
            {chat?.olderCursor && (
              <button
                type="button"
                onClick={() => void older()}
                disabled={loadingOlder}
                className="mx-auto mb-2 block rounded-full bg-white px-3 py-1.5 text-xs font-bold text-primary shadow-sm ring-1 ring-border disabled:opacity-60"
                aria-busy={Boolean(loadingOlder)}
              >
                {loadingOlder ? (
                  <>
                    <HeartbeatLoader />
                    {'در حال دریافت…'}
                  </>
                ) : (
                  'پیام‌های قدیمی‌تر این ویزیت'
                )}
              </button>
            )}
            {!chat && !error && <LoadingState variant="chat" />}
            {error && (
              <p
                role="alert"
                className="mx-auto max-w-md rounded-xl bg-red-50 px-3 py-2 text-center text-xs leading-5 text-red-700"
              >
                {error}
              </p>
            )}
            {chat?.messages.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                هنوز پیامی ثبت نشده است. اولین پیام را بفرستید.
              </p>
            )}
            <div role="log" aria-label="پیام‌های گفتگو" aria-live="polite" className="space-y-2">
              {groups.map((group) => (
                <div key={group.key}>
                  <div className="my-3 text-center">
                    <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] text-muted-foreground shadow-sm ring-1 ring-border">
                      {group.label}
                    </span>
                  </div>
                  <div className="chat-message-stack">
                    {chat &&
                      group.items.map((message, index) =>
                        renderMessage(
                          message,
                          chat.conversation.id,
                          group.items[index - 1],
                          group.items[index + 1],
                        ),
                      )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
        {!atBottom && (
          <button
            type="button"
            onClick={jumpToLatest}
            className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-primary shadow-md ring-1 ring-border"
          >
            رفتن به آخر گفتگو
            <ChevronDown size={14} aria-hidden="true" />
          </button>
        )}
      </div>
      {isClosed ? (
        <section
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="max-h-[60%] min-h-0 flex-shrink-0 overflow-y-auto overscroll-contain border-t border-border bg-white px-3 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] group-data-[keyboard=open]:pb-3"
        >
          <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-[var(--dp-surface-back)] p-3.5">
            <div className="flex items-start gap-3">
              <span
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                aria-hidden="true"
              >
                <CheckCircle2 size={18} />
              </span>
              <div className="min-w-0 text-start">
                <h2 className="text-sm font-bold text-foreground">این ویزیت به پایان رسید</h2>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">
                  گفتگوی این ویزیت پایان یافته است و امکان ارسال پیام جدید وجود ندارد. سابقهٔ پیامها
                  همچنان در این صفحه در دسترس شماست.
                </p>
              </div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Link
                href="/"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                بازگشت به صفحهٔ اصلی
              </Link>
              <Link
                href="/appointments"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-white px-4 text-sm font-bold text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                مشاهدهٔ نوبت‌های من
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <form
          dir="rtl"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
          className="absolute inset-x-0 bottom-0 z-50 flex bg-transparent px-2 pt-2 pb-[max(10px,env(safe-area-inset-bottom))] group-data-[keyboard=open]:pb-2.5"
        >
          <div className="flex w-full min-w-0 items-end gap-1.5 rounded-full border border-white/10 bg-[#090a0b]/75 px-1.5 py-1.5 shadow-sm backdrop-blur-lg">
            <button
              type="submit"
              aria-label={sending ? 'در حال ارسال پیام…' : 'ارسال پیام'}
              aria-busy={sending}
              disabled={!canSend || sending || !text.trim()}
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
            >
              {sending ? <HeartbeatLoader className="m-0" /> : <Send size={18} aria-hidden="true" />}
            </button>
            <div className="min-w-0 flex-1">
              <textarea
                ref={composer}
                rows={1}
                aria-label="متن پیام"
                value={text}
                onChange={(event) => {
                  setText(event.target.value);
                  grow(event.currentTarget);
                }}
                onKeyDown={onComposerKeyDown}
                onCompositionStart={() => {
                  composing.current = true;
                }}
                onCompositionEnd={() => {
                  composing.current = false;
                }}
                disabled={!canSend}
                maxLength={4000}
                placeholder={canSend ? 'نوشتن پیام …' : 'ارسال پیام در دسترس نیست'}
                className="block max-h-32 min-h-11 w-full resize-none rounded-full bg-transparent px-3.5 py-2.5 text-base leading-6 text-white outline-none placeholder:text-white/65 disabled:opacity-60"
              />
            </div>
            {chat && (
              <AttachmentPicker
                key={chat.conversation.id}
                engine={chatEngine}
                token={authentication.accessToken}
                conversationId={chat.conversation.id}
                disabled={!canSend}
                buttonClassName="text-white/80 hover:bg-white/10 focus-visible:outline-white"
                onSent={(message) => {
                  const id = chat.conversation.id;
                  trackNewMessage(message);
                  setChat((current) =>
                    current?.conversation.id === id
                      ? { ...current, messages: reconcileChatMessages(current.messages, message) }
                      : current,
                  );
                }}
              />
            )}
          </div>
        </form>
      )}
    </div>
  );
}
