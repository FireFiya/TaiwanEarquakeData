import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';

export type DataSource = 'cwa' | 'usgs';

const CWA_KEY = 'rdec-key-123-45678-011121314';
const CWA_BASE = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore';
const USGS_URL = 'https://earthquake.usgs.gov/fdsnws/event/1/query';

export interface ShakingArea {
  CountyName: string;
  AreaIntensity: string;
  AreaDesc: string;
}

export interface Earthquake {
  id: string;
  source: DataSource;
  magnitude: number;
  magType: string;
  place: string;
  time: number;
  depth: number;
  latitude: number;
  longitude: number;
  tsunami: number;
  url: string;
  mmi: number | null;
  // CWA only
  maxIntensity: string;
  shakingAreas: ShakingArea[];
  shakemapImgURI: string;
  reportImageURI: string;
  reportContent: string;
}

const INTENSITY_ORDER = ['1', '2', '3', '4', '5弱', '5強', '6弱', '6強', '7'];

function normalizeIntensity(val: string): string {
  return val?.trim().replace(/\s*級\s*$/, '') ?? '';
}

export function getMaxIntensity(areas: ShakingArea[]): string {
  if (!areas || areas.length === 0) return '';
  let maxIdx = -1;
  let maxVal = '';
  for (const area of areas) {
    const idx = INTENSITY_ORDER.indexOf(normalizeIntensity(area.AreaIntensity));
    if (idx > maxIdx) { maxIdx = idx; maxVal = area.AreaIntensity; }
  }
  return maxVal || areas[0]?.AreaIntensity || '';
}

export function getIntensityColor(intensity: string): string {
  const level = normalizeIntensity(intensity).replace(/[弱強]/g, '');
  const num = parseInt(level);
  if (isNaN(num)) return 'medium';
  if (num <= 2) return 'success';
  if (num <= 4) return 'warning';
  if (num <= 5) return 'tertiary';
  return 'danger';
}

export function getMagnitudeColor(mag: number): string {
  if (mag < 4) return 'success';
  if (mag < 5) return 'warning';
  if (mag < 6) return 'tertiary';
  return 'danger';
}

export function getMmiColor(mmi: number | null): string {
  if (!mmi || mmi < 2) return 'medium';
  if (mmi < 4) return 'success';
  if (mmi < 6) return 'warning';
  if (mmi < 8) return 'tertiary';
  return 'danger';
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function parseCWA(eq: any): Earthquake {
  const areas: ShakingArea[] = eq.Intensity?.ShakingArea ?? [];
  return {
    id: String(eq.EarthquakeNo),
    source: 'cwa',
    magnitude: eq.EarthquakeInfo.EarthquakeMagnitude.MagnitudeValue,
    magType: 'ML',
    place: eq.EarthquakeInfo.Epicenter.Location,
    time: new Date(eq.EarthquakeInfo.OriginTime.replace(' ', 'T')).getTime(),
    depth: eq.EarthquakeInfo.FocalDepth,
    latitude: eq.EarthquakeInfo.Epicenter.EpicenterLatitude,
    longitude: eq.EarthquakeInfo.Epicenter.EpicenterLongitude,
    tsunami: 0,
    url: eq.Web ?? '',
    mmi: null,
    maxIntensity: getMaxIntensity(areas),
    shakingAreas: areas,
    shakemapImgURI: eq.ShakemapImgURI ?? '',
    reportImageURI: eq.ReportImageURI ?? '',
    reportContent: eq.ReportContent ?? '',
  };
}

function parseUSGS(f: any): Earthquake {
  return {
    id: f.id,
    source: 'usgs',
    magnitude: f.properties.mag ?? 0,
    magType: f.properties.magType ?? '',
    place: f.properties.place ?? '',
    time: f.properties.time,
    depth: +(f.geometry.coordinates[2] ?? 0).toFixed(1),
    latitude: f.geometry.coordinates[1],
    longitude: f.geometry.coordinates[0],
    tsunami: f.properties.tsunami ?? 0,
    url: f.properties.url ?? '',
    mmi: f.properties.mmi ?? null,
    maxIntensity: '',
    shakingAreas: [],
    shakemapImgURI: '',
    reportImageURI: '',
    reportContent: '',
  };
}

export const useEarthquakeStore = defineStore('earthquake', () => {
  const currentList = ref<Earthquake[]>([]);
  const cache = ref<Map<string, Earthquake>>(new Map());
  const isLoading = ref(false);
  const error = ref('');
  const currentPage = ref(1);
  const pageSize = ref(10);
  const hasMore = ref(true);
  const source = ref<DataSource>('cwa');

  const fetchPage = async (page: number, size?: number) => {
    isLoading.value = true;
    error.value = '';
    currentPage.value = page;
    if (size !== undefined) pageSize.value = size;
    try {
      let list: Earthquake[] = [];

      if (source.value === 'cwa') {
        const params = {
          Authorization: CWA_KEY,
          limit: pageSize.value,
          offset: (page - 1) * pageSize.value,
          format: 'JSON',
        };
        const [resA, resB] = await Promise.all([
          axios.get(`${CWA_BASE}/E-A0015-001`, { params }),
          axios.get(`${CWA_BASE}/E-A0016-001`, { params }),
        ]);
        const raw = [...(resA.data?.records?.Earthquake ?? []), ...(resB.data?.records?.Earthquake ?? [])];
        const seen = new Set<string>();
        for (const eq of raw) {
          const id = String(eq.EarthquakeNo);
          if (!seen.has(id)) { seen.add(id); list.push(parseCWA(eq)); }
        }
        list.sort((a, b) => b.time - a.time);
        hasMore.value = (resA.data?.records?.Earthquake?.length ?? 0) === pageSize.value
          || (resB.data?.records?.Earthquake?.length ?? 0) === pageSize.value;
      } else {
        const res = await axios.get(USGS_URL, {
          params: {
            format: 'geojson',
            minlatitude: 21, maxlatitude: 26,
            minlongitude: 119, maxlongitude: 123,
            minmagnitude: 3,
            orderby: 'time',
            starttime: '2000-01-01',
            limit: pageSize.value,
            offset: (page - 1) * pageSize.value + 1,
          }
        });
        list = (res.data?.features ?? []).map(parseUSGS);
        hasMore.value = list.length === pageSize.value;
      }

      list.forEach(eq => cache.value.set(eq.id, eq));
      currentList.value = list;
    } catch (e) {
      error.value = '無法取得地震資料，請確認網路連線';
      console.error(e);
    } finally {
      isLoading.value = false;
    }
  };

  const setSource = (s: DataSource) => {
    source.value = s;
    currentList.value = [];
    fetchPage(1);
  };

  const getById = (id: string) => cache.value.get(id);

  return { currentList, isLoading, error, currentPage, pageSize, hasMore, source, fetchPage, setSource, getById };
});
