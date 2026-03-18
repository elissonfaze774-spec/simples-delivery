import { useEffect, useRef } from 'react';
import { useOrders } from '../contexts/OrderContext';
import { toast } from 'sonner';

let audioContextInstance: AudioContext | null = null;
let audioUnlocked = false;

function getAudioContext() {
  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;

    if (!AudioContextClass) return null;

    if (!audioContextInstance) {
      audioContextInstance = new AudioContextClass();
    }

    return audioContextInstance;
  } catch {
    return null;
  }
}

async function unlockAudio() {
  try {
    const context = getAudioContext();
    if (!context) return;

    if (context.state === 'suspended') {
      await context.resume();
    }

    audioUnlocked = context.state === 'running';
  } catch {
    //
  }
}

function setupAudioUnlock() {
  if (typeof window === 'undefined') return;

  const tryUnlock = async () => {
    await unlockAudio();

    if (audioUnlocked) {
      window.removeEventListener('pointerdown', tryUnlock);
      window.removeEventListener('keydown', tryUnlock);
      window.removeEventListener('touchstart', tryUnlock);
      window.removeEventListener('click', tryUnlock);
    }
  };

  window.addEventListener('pointerdown', tryUnlock, { passive: true });
  window.addEventListener('keydown', tryUnlock);
  window.addEventListener('touchstart', tryUnlock, { passive: true });
  window.addEventListener('click', tryUnlock, { passive: true });
}

function playTone(
  context: AudioContext,
  startTime: number,
  frequency: number,
  duration: number,
  volume: number
) {
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, startTime);

  gainNode.gain.setValueAtTime(0.0001, startTime);
  gainNode.gain.exponentialRampToValueAtTime(volume, startTime + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.02);
}

async function playNotificationSound() {
  try {
    const context = getAudioContext();
    if (!context) return;

    if (context.state === 'suspended') {
      await context.resume();
    }

    if (context.state !== 'running') return;

    const now = context.currentTime + 0.02;

    playTone(context, now, 880, 0.16, 0.09);
    playTone(context, now + 0.18, 1174.66, 0.18, 0.08);
    playTone(context, now + 0.40, 987.77, 0.28, 0.07);
  } catch (error) {
    console.error('Não foi possível tocar o som de notificação:', error);
  }
}

export function useOrderNotifications(storeId?: string) {
  const { getStoreOrders } = useOrders();
  const previousOrderIds = useRef<string[]>([]);
  const hasInitialized = useRef(false);

  useEffect(() => {
    setupAudioUnlock();
    void unlockAudio();
  }, []);

  useEffect(() => {
    if (!storeId) return;

    const checkOrders = async () => {
      const storeOrders = getStoreOrders(storeId) || [];
      const currentIds = storeOrders.map((order) => String(order.id));

      if (!hasInitialized.current) {
        previousOrderIds.current = currentIds;
        hasInitialized.current = true;
        return;
      }

      const newOrders = storeOrders.filter(
        (order) => !previousOrderIds.current.includes(String(order.id))
      );

      if (newOrders.length > 0) {
        const newestOrder = newOrders[0];

        await playNotificationSound();

        toast.success('🔔 Novo pedido recebido!', {
          description: `Pedido ${newestOrder.code} - R$ ${Number(newestOrder.total || 0).toFixed(2)}`,
          duration: 5000,
        });
      }

      previousOrderIds.current = currentIds;
    };

    checkOrders();

    const interval = window.setInterval(checkOrders, 1500);

    return () => {
      window.clearInterval(interval);
    };
  }, [getStoreOrders, storeId]);
}