import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';

const BASE_URL = 'http://localhost:3000/bookmarks';

export interface Bookmark {
  id: number;
  earthquakeId: string;
  time: number;
  place: string;
  magnitude: number;
  depth: number;
  savedAt: string;
}

export const useBookmarkStore = defineStore('bookmark', () => {
  const bookmarks = ref<Bookmark[]>([]);
  const isLoading = ref(false);

  const fetchBookmarks = async () => {
    isLoading.value = true;
    try {
      const res = await axios.get(BASE_URL);
      bookmarks.value = res.data;
    } catch (e) {
      console.error('無法取得書籤', e);
    } finally {
      isLoading.value = false;
    }
  };

  const isBookmarked = (earthquakeId: string) =>
    bookmarks.value.some(b => b.earthquakeId === earthquakeId);

  const addBookmark = async (payload: Omit<Bookmark, 'id' | 'savedAt'>) => {
    const res = await axios.post(BASE_URL, payload);
    bookmarks.value.unshift(res.data);
  };

  const removeBookmark = async (earthquakeId: string) => {
    await axios.delete(`${BASE_URL}/${encodeURIComponent(earthquakeId)}`);
    bookmarks.value = bookmarks.value.filter(b => b.earthquakeId !== earthquakeId);
  };

  return { bookmarks, isLoading, fetchBookmarks, isBookmarked, addBookmark, removeBookmark };
});
