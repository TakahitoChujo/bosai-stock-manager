import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { initDB } from './src/database/db';
import { useStore } from './src/store/useStore';
import Navigation from './src/navigation';
import { scheduleExpiryNotifications, requestNotificationPermission } from './src/utils/notifications';

export default function App() {
  const { loadAll, items, settings } = useStore();

  useEffect(() => {
    initDB();
    loadAll();
  }, []);

  // オンボーディング完了後に通知権限をリクエスト
  useEffect(() => {
    if (settings.isOnboarded) {
      requestNotificationPermission();
    }
  }, [settings.isOnboarded]);

  // 通知をアイテム・設定が変わるたびに再スケジュール
  useEffect(() => {
    if (settings.isOnboarded && items.length > 0) {
      scheduleExpiryNotifications(items, settings);
    }
  }, [items, settings]);

  return (
    <>
      <StatusBar style="dark" />
      <Navigation />
    </>
  );
}
