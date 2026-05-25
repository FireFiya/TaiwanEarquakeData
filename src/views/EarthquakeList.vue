<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar color="danger">
        <ion-title>台灣地震資料</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="store.fetchPage(store.currentPage)">
            <ion-icon slot="icon-only" :icon="refreshIcon" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar color="danger">
        <ion-searchbar
          v-model="searchText"
          placeholder="搜尋震央地點"
          color="light"
          :debounce="300"
        />
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <!-- 來源切換 + 每頁筆數 -->
      <div class="control-bar">
        <div class="source-group">
          <button
            class="src-btn"
            :class="{ active: store.source === 'cwa' }"
            @click="store.setSource('cwa')"
          >🇹🇼 台灣</button>
          <button
            class="src-btn"
            :class="{ active: store.source === 'usgs' }"
            @click="store.setSource('usgs')"
          >🌐 USGS</button>
        </div>

        <div class="size-group">
          <span class="size-label">每頁：</span>
          <button
            v-for="n in [5, 10, 20]"
            :key="n"
            class="src-btn"
            :class="{ active: store.pageSize === n }"
            @click="store.fetchPage(1, n)"
          >{{ n }}</button>
        </div>
      </div>

      <!-- 載入中 -->
      <div v-if="store.isLoading" class="center-box">
        <ion-spinner name="crescent" color="danger" />
        <p>正在抓取第 {{ store.currentPage }} 頁資料...</p>
      </div>

      <!-- 錯誤 -->
      <div v-else-if="store.error" class="center-box">
        <ion-icon :icon="warningIcon" color="warning" style="font-size: 48px;" />
        <p>{{ store.error }}</p>
        <ion-button color="danger" @click="store.fetchPage(1)">重試</ion-button>
      </div>

      <template v-else>
        <div v-if="filtered.length === 0" class="center-box">
          <p v-if="searchText">找不到符合「{{ searchText }}」的地震</p>
          <p v-else>此頁沒有資料</p>
        </div>

        <ion-card
          v-for="eq in filtered"
          :key="eq.id"
          :router-link="'/detail/' + eq.id"
          class="eq-card"
        >
          <ion-card-header>
            <div class="card-title-row">
              <ion-card-title class="eq-location">{{ eq.place }}</ion-card-title>
              <ion-badge :color="getMagnitudeColor(eq.magnitude)" class="mag-badge">
                M {{ eq.magnitude.toFixed(1) }}
              </ion-badge>
            </div>
            <ion-card-subtitle>{{ formatTime(eq.time) }}</ion-card-subtitle>
          </ion-card-header>

          <ion-card-content>
            <div class="card-info-row">
              <span class="info-item">
                <ion-icon :icon="layersIcon" />
                深度 {{ eq.depth }} km
              </span>
              <span>
                <!-- CWA：顯示震度 badge -->
                <ion-badge
                  v-if="eq.source === 'cwa' && eq.maxIntensity"
                  :color="getIntensityColor(eq.maxIntensity)"
                  class="intensity-badge"
                >最大震度 {{ eq.maxIntensity }}</ion-badge>
                <!-- USGS：顯示海嘯警報 -->
                <ion-badge v-else-if="eq.tsunami" color="danger">⚠ 海嘯警報</ion-badge>
              </span>
            </div>
          </ion-card-content>
        </ion-card>
      </template>

      <!-- 分頁控制列 -->
      <div class="pagination-bar" v-if="!store.isLoading && !store.error">
        <ion-button
          fill="outline" color="danger" size="small"
          :disabled="store.currentPage <= 1"
          @click="goPage(store.currentPage - 1)"
        >
          <ion-icon slot="start" :icon="chevronBackIcon" />上一頁
        </ion-button>

        <div class="page-indicator">
          第
          <input
            class="page-input"
            type="number"
            min="1"
            :value="store.currentPage"
            @keyup.enter="jumpToPage(($event.target as HTMLInputElement).value)"
            @blur="jumpToPage(($event.target as HTMLInputElement).value)"
          />
          頁
        </div>

        <ion-button
          fill="outline" color="danger" size="small"
          :disabled="!store.hasMore"
          @click="goPage(store.currentPage + 1)"
        >
          下一頁<ion-icon slot="end" :icon="chevronForwardIcon" />
        </ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onIonViewWillEnter } from '@ionic/vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
  IonBadge, IonSpinner, IonIcon, IonButton, IonButtons,
  IonSearchbar, IonRefresher, IonRefresherContent,

} from '@ionic/vue';
import {
  refresh as refreshIcon, warning as warningIcon, layers as layersIcon,
  chevronBack as chevronBackIcon, chevronForward as chevronForwardIcon,
} from 'ionicons/icons';

import {
  useEarthquakeStore, getMagnitudeColor, getIntensityColor, formatTime
} from '@/stores/earthquake';

const store = useEarthquakeStore();
const searchText = ref('');

onIonViewWillEnter(() => {
  if (store.currentList.length === 0) store.fetchPage(1);
});

const filtered = computed(() => {
  if (!searchText.value.trim()) return store.currentList;
  const q = searchText.value.trim().toLowerCase();
  return store.currentList.filter(eq => eq.place.toLowerCase().includes(q));
});

function goPage(page: number) {
  if (page < 1) return;
  store.fetchPage(page);
}

function jumpToPage(val: string) {
  const page = parseInt(val);
  if (!isNaN(page) && page >= 1) store.fetchPage(page);
}

async function handleRefresh(event: CustomEvent) {
  await store.fetchPage(store.currentPage);
  (event.target as HTMLIonRefresherElement).complete();
}
</script>

<style scoped>
.control-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--ion-background-color, #f4f4f4);
  border-bottom: 1px solid var(--ion-border-color, #ddd);
  gap: 8px;
}

.source-group {
  display: flex;
  gap: 4px;
}

.src-btn {
  padding: 4px 10px;
  border-radius: 16px;
  border: 1.5px solid var(--ion-color-danger);
  background: transparent;
  color: var(--ion-color-danger);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.src-btn.active {
  background: var(--ion-color-danger);
  color: #fff;
}

.size-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.size-label {
  font-size: 13px;
  color: #666;
  white-space: nowrap;
}


.center-box {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; margin-top: 60px; gap: 12px; color: #888;
}

.eq-card {
  margin: 8px 12px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card-title-row {
  display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;
}

.eq-location { font-size: 15px; font-weight: 600; flex: 1; }
.mag-badge { font-size: 13px; padding: 4px 8px; white-space: nowrap; border-radius: 8px; }

.card-info-row {
  display: flex; justify-content: space-between; align-items: center; margin-top: 4px;
}

.info-item {
  display: flex; align-items: center; gap: 4px; font-size: 13px; color: #666;
}

.intensity-badge { font-size: 12px; padding: 3px 8px; border-radius: 8px; }

.pagination-bar {
  display: flex; justify-content: center; align-items: center;
  gap: 12px; padding: 16px 0 28px;
}

.page-indicator {
  display: flex; align-items: center; gap: 4px;
  font-size: 16px; font-weight: 700; color: var(--ion-color-danger);
}

.page-input {
  width: 48px;
  text-align: center;
  font-size: 16px;
  font-weight: 700;
  color: var(--ion-color-danger);
  background: transparent;
  border: none;
  border-bottom: 2px solid var(--ion-color-danger);
  outline: none;
  padding: 0 2px;
  -moz-appearance: textfield;
}
.page-input::-webkit-inner-spin-button,
.page-input::-webkit-outer-spin-button { -webkit-appearance: none; }
</style>
