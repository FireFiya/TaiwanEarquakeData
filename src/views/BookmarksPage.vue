<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar color="danger">
        <ion-title>我的收藏</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div v-if="bookmarkStore.isLoading" class="center-box">
        <ion-spinner name="crescent" color="danger" />
        <p>載入收藏中...</p>
      </div>

      <div v-else-if="bookmarkStore.bookmarks.length === 0" class="center-box">
        <ion-icon :icon="bookmarkOutline" style="font-size: 64px; color: #ccc;" />
        <p>還沒有收藏任何地震</p>
        <p style="font-size: 13px; color: #aaa;">前往地震列表，點右上角書籤即可收藏</p>
      </div>

      <ion-list v-else>
        <ion-item-sliding
          v-for="item in bookmarkStore.bookmarks"
          :key="item.id"
        >
          <ion-item :router-link="'/detail/' + item.earthquakeId" detail>
            <ion-label>
              <h2>{{ item.place }}</h2>
              <p>{{ formatTime(item.time) }}</p>
            </ion-label>
            <div slot="end" class="badge-group">
              <ion-badge :color="getMagnitudeColor(item.magnitude)">
                M {{ item.magnitude.toFixed(1) }}
              </ion-badge>
              <span class="depth-text">{{ item.depth }} km</span>
            </div>
          </ion-item>

          <ion-item-options side="end">
            <ion-item-option color="danger" @click="removeItem(item.earthquakeId)">
              <ion-icon slot="icon-only" :icon="trashIcon" />
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onIonViewWillEnter } from '@ionic/vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonList, IonItem, IonItemSliding, IonItemOptions, IonItemOption,
  IonLabel, IonBadge, IonIcon, IonSpinner,
} from '@ionic/vue';
import { bookmarkOutline, trash as trashIcon } from 'ionicons/icons';

import { useBookmarkStore } from '@/stores/bookmark';
import { getMagnitudeColor, formatTime } from '@/stores/earthquake';

const bookmarkStore = useBookmarkStore();

onIonViewWillEnter(() => {
  bookmarkStore.fetchBookmarks();
});

async function removeItem(earthquakeId: string) {
  await bookmarkStore.removeBookmark(earthquakeId);
}
</script>

<style scoped>
.center-box {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; margin-top: 80px; gap: 10px;
  color: #888; text-align: center; padding: 0 32px;
}
.badge-group { display: flex; flex-direction: column; gap: 4px; align-items: flex-end; }
ion-badge { font-size: 11px; padding: 3px 6px; border-radius: 6px; }
.depth-text { font-size: 11px; color: #888; }
</style>
