<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="danger">
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/list" />
        </ion-buttons>
        <ion-title>地震詳細資訊</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="toggleBookmark" :disabled="bookmarkLoading">
            <ion-icon
              slot="icon-only"
              :icon="isBookmarked ? bookmarkFilled : bookmarkOutline"
              :color="isBookmarked ? 'warning' : 'light'"
            />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <div v-if="!eq" class="center-box">
        <ion-spinner name="crescent" color="danger" />
        <p>載入中...</p>
      </div>

      <template v-else>
        <!-- 基本資訊（兩種來源共用） -->
        <ion-card class="info-card">
          <ion-card-header>
            <ion-card-title>{{ eq.place }}</ion-card-title>
            <ion-card-subtitle>{{ formatTime(eq.time) }}</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <ion-grid>
              <ion-row>
                <ion-col size="4" class="stat-col">
                  <div class="stat-label">芮氏規模</div>
                  <ion-badge :color="getMagnitudeColor(eq.magnitude)" class="stat-badge">
                    M {{ eq.magnitude.toFixed(1) }}
                  </ion-badge>
                  <div class="stat-sub">{{ eq.magType?.toUpperCase() }}</div>
                </ion-col>
                <ion-col size="4" class="stat-col">
                  <div class="stat-label">震源深度</div>
                  <div class="stat-value">{{ eq.depth }} km</div>
                </ion-col>
                <ion-col size="4" class="stat-col">
                  <div class="stat-label">震央位置</div>
                  <div class="stat-value coords">
                    {{ eq.latitude.toFixed(2) }}°N<br />{{ eq.longitude.toFixed(2) }}°E
                  </div>
                </ion-col>
              </ion-row>
            </ion-grid>

            <!-- CWA 最大震度摘要 -->
            <div v-if="eq.source === 'cwa' && eq.maxIntensity" class="intensity-summary">
              <ion-badge :color="getIntensityColor(eq.maxIntensity)" class="intensity-main">
                最大震度 {{ eq.maxIntensity }}
              </ion-badge>
            </div>

            <!-- USGS PAGER 警報 -->
            <div v-if="eq.source === 'usgs' && usgsDetail?.alert" class="alert-row">
              <ion-badge :color="alertColor(usgsDetail.alert)" class="alert-badge">
                PAGER：{{ usgsDetail.alert.toUpperCase() }}
              </ion-badge>
            </div>

            <!-- 海嘯 -->
            <div v-if="eq.tsunami" class="tsunami-alert">⚠ 此地震曾發出海嘯警報</div>
          </ion-card-content>
        </ion-card>

        <!-- ===== CWA 專區 ===== -->
        <template v-if="eq.source === 'cwa'">
          <!-- 震度分布圖 -->
          <ion-card v-if="eq.shakemapImgURI || eq.reportImageURI" class="info-card">
            <ion-card-header><ion-card-title>震度分布圖</ion-card-title></ion-card-header>
            <ion-card-content style="padding:0;">
              <img :src="eq.shakemapImgURI || eq.reportImageURI" alt="震度分布圖" style="width:100%;display:block;" />
            </ion-card-content>
          </ion-card>

          <!-- 各地區震度 -->
          <ion-card v-if="eq.shakingAreas.length" class="info-card">
            <ion-card-header><ion-card-title>各地區震度</ion-card-title></ion-card-header>
            <ion-card-content>
              <ion-list lines="none" class="intensity-list">
                <ion-item
                  v-for="area in sortedAreas"
                  :key="area.CountyName"
                  class="intensity-item"
                >
                  <ion-label>{{ area.CountyName }}</ion-label>
                  <ion-badge slot="end" :color="getIntensityColor(area.AreaIntensity)" class="area-badge">
                    震度 {{ area.AreaIntensity }}
                  </ion-badge>
                </ion-item>
              </ion-list>
            </ion-card-content>
          </ion-card>

          <!-- 地震報告文字 -->
          <ion-card v-if="eq.reportContent" class="info-card">
            <ion-card-header><ion-card-title>地震報告</ion-card-title></ion-card-header>
            <ion-card-content>
              <p class="report-text">{{ eq.reportContent }}</p>
            </ion-card-content>
          </ion-card>

          <!-- CWA 完整報告 -->
          <ion-card v-if="eq.url" class="info-card">
            <ion-card-content>
              <ion-button expand="block" fill="outline" color="danger" :href="eq.url" target="_blank">
                <ion-icon slot="start" :icon="openOutlineIcon" />
                查看中央氣象署完整報告
              </ion-button>
            </ion-card-content>
          </ion-card>
        </template>

        <!-- ===== USGS 專區 ===== -->
        <template v-if="eq.source === 'usgs'">
          <!-- 震度與感受 -->
          <ion-card v-if="usgsDetail?.mmi || usgsDetail?.felt" class="info-card">
            <ion-card-header><ion-card-title>震度資訊</ion-card-title></ion-card-header>
            <ion-card-content>
              <ion-grid>
                <ion-row>
                  <ion-col v-if="usgsDetail.mmi" size="4" class="stat-col">
                    <div class="stat-label">估算震度</div>
                    <ion-badge :color="getMmiColor(usgsDetail.mmi)" class="stat-badge">
                      MMI {{ usgsDetail.mmi.toFixed(1) }}
                    </ion-badge>
                    <div class="stat-sub">{{ mmiDesc(usgsDetail.mmi) }}</div>
                  </ion-col>
                  <ion-col v-if="usgsDetail.cdi" size="4" class="stat-col">
                    <div class="stat-label">社群感受</div>
                    <ion-badge :color="getMmiColor(usgsDetail.cdi)" class="stat-badge">
                      CDI {{ usgsDetail.cdi.toFixed(1) }}
                    </ion-badge>
                  </ion-col>
                  <ion-col v-if="usgsDetail.felt" size="4" class="stat-col">
                    <div class="stat-label">有感回報</div>
                    <div class="stat-value">{{ usgsDetail.felt }}</div>
                    <div class="stat-sub">筆</div>
                  </ion-col>
                </ion-row>
              </ion-grid>
            </ion-card-content>
          </ion-card>

          <!-- USGS ShakeMap 圖 -->
          <ion-card v-if="usgsDetail?.shakemapUrl" class="info-card">
            <ion-card-header><ion-card-title>震度分布圖（ShakeMap）</ion-card-title></ion-card-header>
            <ion-card-content style="padding:0;">
              <img :src="usgsDetail.shakemapUrl" alt="ShakeMap" style="width:100%;display:block;" />
            </ion-card-content>
          </ion-card>

          <!-- 載入中提示 -->
          <div v-if="usgsLoading" class="loading-row">
            <ion-spinner name="dots" color="medium" />
            <span>正在載入詳細資料...</span>
          </div>

          <!-- USGS 完整報告 -->
          <ion-card class="info-card">
            <ion-card-content>
              <ion-button expand="block" fill="outline" color="danger" :href="eq.url" target="_blank">
                <ion-icon slot="start" :icon="openOutlineIcon" />
                查看 USGS 完整地震報告
              </ion-button>
            </ion-card-content>
          </ion-card>
        </template>
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { onIonViewWillEnter } from '@ionic/vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
  IonBackButton, IonButton, IonIcon, IonSpinner,
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
  IonGrid, IonRow, IonCol, IonBadge, IonList, IonItem, IonLabel,
} from '@ionic/vue';
import { bookmark as bookmarkFilled, bookmarkOutline, openOutline as openOutlineIcon } from 'ionicons/icons';
import axios from 'axios';

import {
  useEarthquakeStore,
  getMagnitudeColor, getMmiColor, getIntensityColor, formatTime,
  type ShakingArea,
} from '@/stores/earthquake';
import { useBookmarkStore } from '@/stores/bookmark';

const INTENSITY_ORDER = ['1', '2', '3', '4', '5弱', '5強', '6弱', '6強', '7'];

const route = useRoute();
const eqStore = useEarthquakeStore();
const bookmarkStore = useBookmarkStore();
const bookmarkLoading = ref(false);
const usgsLoading = ref(false);

interface UsgsExtra {
  felt: number | null;
  cdi: number | null;
  mmi: number | null;
  alert: string | null;
  shakemapUrl: string | null;
}

const usgsDetail = ref<UsgsExtra | null>(null);
const eq = computed(() => eqStore.getById(route.params.id as string));
const isBookmarked = computed(() => bookmarkStore.isBookmarked(route.params.id as string));

const sortedAreas = computed(() => {
  const areas: ShakingArea[] = eq.value?.shakingAreas ?? [];
  return [...areas].sort((a, b) => {
    const ai = INTENSITY_ORDER.indexOf(a.AreaIntensity.trim().replace(/\s*級\s*$/, ''));
    const bi = INTENSITY_ORDER.indexOf(b.AreaIntensity.trim().replace(/\s*級\s*$/, ''));
    return bi - ai;
  });
});

onIonViewWillEnter(() => {
  bookmarkStore.fetchBookmarks();
  usgsDetail.value = null;
  if (eq.value?.source === 'usgs') fetchUsgsDetail();
});

async function fetchUsgsDetail() {
  const id = route.params.id as string;
  usgsLoading.value = true;
  try {
    const res = await axios.get('https://earthquake.usgs.gov/fdsnws/event/1/query', {
      params: { format: 'geojson', eventid: id }
    });
    const p = res.data?.properties ?? {};
    const sm = p.products?.shakemap?.[0];
    const contents = sm?.contents ?? {};
    const imgKey = Object.keys(contents).find(k => k === 'download/intensity.jpg')
      ?? Object.keys(contents).find(k => k.includes('intensity') && k.endsWith('.jpg'));

    usgsDetail.value = {
      felt: p.felt ?? null,
      cdi: p.cdi ?? null,
      mmi: p.mmi ?? null,
      alert: p.alert ?? null,
      shakemapUrl: imgKey ? contents[imgKey]?.url : null,
    };
  } catch (e) {
    console.error('USGS detail 載入失敗', e);
  } finally {
    usgsLoading.value = false;
  }
}

function mmiDesc(mmi: number): string {
  if (mmi < 2) return '無感';
  if (mmi < 4) return '輕微有感';
  if (mmi < 6) return '弱～中等';
  if (mmi < 8) return '強烈';
  return '極強烈';
}

function alertColor(alert: string): string {
  return ({ green: 'success', yellow: 'warning', orange: 'tertiary', red: 'danger' } as any)[alert] ?? 'medium';
}

async function toggleBookmark() {
  if (!eq.value) return;
  bookmarkLoading.value = true;
  try {
    const id = eq.value.id;
    if (isBookmarked.value) {
      await bookmarkStore.removeBookmark(id);
    } else {
      await bookmarkStore.addBookmark({
        earthquakeId: id,
        time: eq.value.time,
        place: eq.value.place,
        magnitude: eq.value.magnitude,
        depth: eq.value.depth,
      });
    }
  } catch (e) {
    console.error('書籤操作失敗', e);
  } finally {
    bookmarkLoading.value = false;
  }
}
</script>

<style scoped>
.center-box {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; margin-top: 80px; gap: 12px; color: #888;
}
.info-card { border-radius: 12px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }

.stat-col {
  display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 8px 4px;
}
.stat-label { font-size: 12px; color: #888; text-align: center; }
.stat-badge { font-size: 14px; padding: 4px 10px; border-radius: 8px; }
.stat-value { font-size: 15px; font-weight: 600; color: #333; text-align: center; }
.stat-sub { font-size: 11px; color: #aaa; }
.coords { font-size: 12px; line-height: 1.6; }

.intensity-summary { margin-top: 10px; display: flex; justify-content: center; }
.intensity-main { font-size: 15px; padding: 5px 14px; border-radius: 10px; }

.alert-row { margin-top: 10px; display: flex; justify-content: center; }
.alert-badge { font-size: 13px; padding: 4px 12px; border-radius: 8px; }

.tsunami-alert {
  margin-top: 12px; padding: 8px 12px;
  background: rgba(255,0,0,0.1); border-radius: 8px;
  color: #d00; font-size: 14px; text-align: center;
}

.intensity-list { padding: 0; }
.intensity-item { --padding-start: 0; --inner-padding-end: 0; }
.area-badge { font-size: 12px; padding: 3px 8px; border-radius: 8px; }

.report-text { font-size: 14px; line-height: 1.7; color: #555; }

.loading-row {
  display: flex; align-items: center; justify-content: center;
  gap: 8px; padding: 12px; color: #aaa; font-size: 13px;
}
</style>
