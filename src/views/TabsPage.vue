<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="list" href="/tabs/list">
          <ion-icon :icon="listIcon" />
          <ion-label>地震列表</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="bookmarks" href="/tabs/bookmarks">
          <ion-icon :icon="bookmarkIcon" />
          <ion-label>我的收藏</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonTabs, IonRouterOutlet, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/vue';
import { list as listIcon, bookmark as bookmarkIcon } from 'ionicons/icons';
</script>
