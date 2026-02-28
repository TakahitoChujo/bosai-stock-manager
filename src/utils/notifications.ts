import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { StockItem, FamilySettings } from '../types';
import { getDaysUntilExpiry } from './helpers';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleExpiryNotifications(
  items: StockItem[],
  settings: FamilySettings
) {
  // 既存の通知をすべてキャンセルしてから再スケジュール
  await Notifications.cancelAllScheduledNotificationsAsync();

  const granted = await requestNotificationPermission();
  if (!granted) return;

  for (const item of items) {
    for (const daysBefore of settings.notifyDays) {
      const daysLeft = getDaysUntilExpiry(item.expiryDate);

      // すでに通知日を過ぎている場合はスキップ
      if (daysLeft <= 0) continue;

      const triggerDaysLeft = daysLeft - daysBefore;
      if (triggerDaysLeft < 0) continue;

      const triggerDate = new Date();
      triggerDate.setDate(triggerDate.getDate() + triggerDaysLeft);
      triggerDate.setHours(9, 0, 0, 0); // 毎朝9時に通知

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🛡️ 備蓄品の期限が近づいています',
          body: `${item.name}の賞味期限まであと${daysBefore}日です。ローリングストックを確認しましょう。`,
          data: { itemId: item.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });
    }
  }
}

export async function sendTestNotification() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🛡️ 防災備蓄マネージャー',
      body: '通知の設定が完了しました！期限前にお知らせします。',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2,
    },
  });
}
