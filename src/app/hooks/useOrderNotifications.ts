import { useEffect, useRef } from 'react';
import { useOrders } from '../contexts/OrderContext';
import { toast } from 'sonner';

export function useOrderNotifications(storeId?: string) {
  const { getStoreOrders } = useOrders();
  const previousOrderCount = useRef<number>(0);
  const hasInitialized = useRef<boolean>(false);

  useEffect(() => {
    if (!storeId) return;

    const storeOrders = getStoreOrders(storeId);
    const currentCount = storeOrders.length;

    if (!hasInitialized.current) {
      previousOrderCount.current = currentCount;
      hasInitialized.current = true;
      return;
    }

    if (currentCount > previousOrderCount.current && storeOrders[0]) {
      const newOrder = storeOrders[0];
      playNotificationSound();
      toast.success('🔔 Novo pedido recebido!', {
        description: `Pedido ${newOrder.code} - R$ ${newOrder.total.toFixed(2)}`,
        duration: 5000,
      });
    }

    previousOrderCount.current = currentCount;
  }, [getStoreOrders, storeId]);
}

function playNotificationSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();
    const notes = [
      { freq: 523.25, duration: 0.15 },
      { freq: 659.25, duration: 0.15 },
      { freq: 783.99, duration: 0.25 },
    ];

    let startTime = audioContext.currentTime;

    notes.forEach((note) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = note.freq;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + note.duration);

      oscillator.start(startTime);
      oscillator.stop(startTime + note.duration);
      startTime += note.duration;
    });
  } catch (error) {
    console.error('Não foi possível tocar o som de notificação:', error);
  }
}
