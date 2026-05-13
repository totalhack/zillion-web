<template>
  <div class="notifications-wrapper" :class="{ 'notifications-wrapper--mobile': breakpointSmOrLess }">
    <transition name="notification-fade">
      <div v-if="show && currentNotification" class="notification-toast" :class="notificationToastClass" @click.stop>
        <div class="notification-content">{{ currentNotificationContent }}</div>
        <div class="notification-actions d-flex justify-center align-center mt-3">
          <v-progress-circular
            class="ma-2"
            indeterminate
            v-show="showProgress"
            :size="20"
            :width="2"
            :color="notificationSpinnerColor"
          ></v-progress-circular>
          <v-btn
            text
            class="notification-close-btn"
            @click.stop.prevent="close"
            @touchend.native.stop.prevent="close"
            @touchstart.native.stop
            @mousedown.native.stop
          >Close</v-btn>
        </div>
      </div>
    </transition>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Watch } from 'vue-property-decorator';
import { AppNotification } from '@/store/main/state';
import { commitRemoveNotification } from '@/store/main/mutations';
import { readFirstNotification } from '@/store/main/getters';
import { dispatchRemoveNotification } from '@/store/main/actions';

@Component
export default class NotificationsManager extends Vue {
  public show: boolean = false;
  public text: string = '';
  public showProgress: boolean = false;
  public currentNotification: AppNotification | false = false;
  public defaultTimeout: number | string = 6000;
  public isClosing: boolean = false;

  public async hide() {
    this.show = false;
    await new Promise<void>((resolve) => setTimeout(() => resolve(undefined), 500));
  }

  public async close() {
    if (this.isClosing) {
      return;
    }
    this.isClosing = true;
    window.dispatchEvent(new CustomEvent('zillion-notification-dismissed'));
    try {
      await this.hide();
      await this.removeCurrentNotification();
    } finally {
      this.isClosing = false;
    }
  }

  public async removeCurrentNotification() {
    if (this.currentNotification) {
      commitRemoveNotification(this.$store, this.currentNotification);
    }
  }

  public get firstNotification() {
    return readFirstNotification(this.$store);
  }

  public async setNotification(notification: AppNotification | false) {
    if (this.show) {
      await this.hide();
    }
    if (notification) {
      this.currentNotification = notification;
      this.showProgress = notification.showProgress || false;
      this.show = true;
    } else {
      this.currentNotification = false;
    }
  }

  @Watch('firstNotification')
  public async onNotificationChange(
    newNotification: AppNotification | false,
    oldNotification: AppNotification | false,
  ) {
    if (newNotification !== this.currentNotification) {
      await this.setNotification(newNotification);
      if (newNotification && newNotification.timeout !== -1) {
        dispatchRemoveNotification(
          this.$store,
          {
            notification: newNotification,
            timeout: (newNotification.timeout as any) || this.defaultTimeout
          });
      }
    }
  }

  public get currentNotificationContent() {
    return this.currentNotification && this.currentNotification.content || '';
  }

  public get currentNotificationColor() {
    return this.currentNotification && this.currentNotification.color || 'info';
  }

  public get currentNotificationTimeout() {
    return this.currentNotification && this.currentNotification.timeout || this.defaultTimeout;
  }

  public get breakpointSmOrLess() {
    return this.$vuetify.breakpoint.xs || this.$vuetify.breakpoint.sm;
  }

  public get notificationToastClass() {
    const color = this.currentNotificationColor || 'info';
    return `notification-toast--${color}`;
  }

  public get notificationSpinnerColor() {
    return 'white';
  }

}
</script>

<style>
.notifications-wrapper {
  position: fixed;
  left: 50%;
  bottom: 16px;
  width: calc(100% - 16px);
  max-width: 720px;
  z-index: 1000;
  transform: translateX(-50%);
  pointer-events: auto;
  box-sizing: border-box;
}

.notifications-wrapper--mobile {
  bottom: 72px;
}

.notification-toast {
  width: 100%;
  max-height: 180px;
  background: #1976d2;
  color: white;
  font-size: 14px;
  line-height: 1.25rem;
  border-radius: 4px;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.3);
  padding: 14px 16px 12px;
  pointer-events: auto;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.notification-toast--error {
  background: #c93a3a;
}

.notification-toast--warning {
  background: #c69214;
  color: rgba(255, 255, 255, 0.96);
}

.notification-toast--success {
  background: #2e7d32;
}

.notification-toast--info {
  background: #1976d2;
}

.notification-fade-enter-active,
.notification-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.notification-fade-enter,
.notification-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.notification-content {
  white-space: pre-line;
  overflow-wrap: anywhere;
  word-break: break-word;
  text-align: left;
  flex: 1 1 auto;
  min-height: 0;
  max-height: 124px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.notification-actions {
  width: 100%;
  flex-wrap: wrap;
  flex: 0 0 auto;
}

.notification-actions .v-btn {
  max-width: 100%;
  font-size: 14px !important;
}

.notification-toast .notification-close-btn.v-btn {
  color: inherit !important;
}

.notification-toast--warning .notification-close-btn.v-btn,
.notification-toast--error .notification-close-btn.v-btn,
.notification-toast--info .notification-close-btn.v-btn,
.notification-toast--success .notification-close-btn.v-btn {
  color: white !important;
}

@media (max-width: 960px) {
  .notifications-wrapper {
    width: calc(100% - 8px);
  }

  .notifications-wrapper--mobile {
    bottom: 64px;
  }

  .notification-toast {
    max-height: 150px;
  }

  .notification-content {
    max-height: 94px;
  }
}
</style>