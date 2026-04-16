<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { getMyReports, createReport } from '@/api/report'
import { BASE_URL } from '@/api/index'
import type { User } from '@/types/user'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow })

const router = useRouter()
const reports = ref<any[]>([])
const user = ref<User | null>(null)

onMounted(async () => {
  const token = localStorage.getItem('token')
  if (!token) {
    router.push('/login')
    return
  }

  user.value = JSON.parse(localStorage.getItem('user') || 'null')
  
  const data = await getMyReports()
  if (!data.error) {
    reports.value = data
  }
})

function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  router.push('/login')
}

const showModal = ref(false)
const form = ref({ title: '', description: '', latitude: '', longitude: '' })
const formError = ref('')

// ── Localisation ──
const locationMode = ref<'address' | 'map'>('address')
const addressQuery = ref('')
const addressLoading = ref(false)
const addressResult = ref('')
const addressError = ref('')

async function searchAddress() {
  if (!addressQuery.value.trim()) return
  addressLoading.value = true
  addressError.value = ''
  addressResult.value = ''
  try {
    const q = encodeURIComponent(addressQuery.value + ', Villejuif, France')
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&accept-language=fr`,
      { headers: { 'User-Agent': 'CityAlert/1.0' } }
    )
    const data = await res.json()
    if (data.length > 0) {
      form.value.latitude  = parseFloat(data[0].lat).toFixed(6)
      form.value.longitude = parseFloat(data[0].lon).toFixed(6)
      addressResult.value  = data[0].display_name
    } else {
      addressError.value = 'Adresse introuvable, essayez avec plus de détails.'
    }
  } catch {
    addressError.value = 'Erreur lors de la recherche d\'adresse.'
  }
  addressLoading.value = false
}

// ── Carte picker ──
const mapPickerContainer = ref<HTMLElement | null>(null)
let pickerMap: L.Map | null = null
let pickerMarker: L.Marker | null = null
const VILLEJUIF_BOUNDS = L.latLngBounds([48.775, 2.340], [48.810, 2.395])

watch(locationMode, async (mode) => {
  if (mode === 'map') {
    await nextTick()
    if (!mapPickerContainer.value || pickerMap) return
    pickerMap = L.map(mapPickerContainer.value, {
      maxBounds: VILLEJUIF_BOUNDS,
      maxBoundsViscosity: 1.0,
      minZoom: 13,
      maxZoom: 19,
    }).setView([48.7937, 2.3647], 14)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(pickerMap)
    const lat = parseFloat(form.value.latitude)
    const lng = parseFloat(form.value.longitude)
    if (!isNaN(lat) && !isNaN(lng)) {
      pickerMarker = L.marker([lat, lng]).addTo(pickerMap)
      pickerMap.setView([lat, lng], 16)
    }
    pickerMap.on('click', (e: L.LeafletMouseEvent) => {
      form.value.latitude  = e.latlng.lat.toFixed(6)
      form.value.longitude = e.latlng.lng.toFixed(6)
      if (pickerMarker) pickerMarker.setLatLng(e.latlng)
      else pickerMarker = L.marker(e.latlng).addTo(pickerMap!)
    })
  } else {
    pickerMap?.remove()
    pickerMap = null
    pickerMarker = null
  }
})

function closeDrawer() {
  showModal.value = false
  locationMode.value = 'address'
  addressQuery.value = ''
  addressResult.value = ''
  addressError.value = ''
  pickerMap?.remove()
  pickerMap = null
  pickerMarker = null
}
const selectedFile = ref<File | null>(null)
const imagePreview = ref<string | null>(null)
const isDragging = ref(false)

function setFile(file: File) {
  if (!file.type.startsWith('image/')) return
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value)
  selectedFile.value = file
  imagePreview.value = URL.createObjectURL(file)
}

function onDrop(e: DragEvent) {
  isDragging.value = false
  const file = e.dataTransfer?.files[0]
  if (file) setFile(file)
}

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) setFile(file)
}

function removeFile() {
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value)
  selectedFile.value = null
  imagePreview.value = null
}

onUnmounted(() => {
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value)
})

function imageUrl(filename: string) {
  return filename ? `${BASE_URL}/uploads/${filename}` : null
}

async function submitReport() {
  formError.value = ''

  if (!form.value.title || !form.value.description) {
    formError.value = 'Titre et description obligatoires.'
    return
  }

  const formData = new FormData()
  formData.append('title', form.value.title)
  formData.append('description', form.value.description)
  formData.append('latitude', form.value.latitude)
  formData.append('longitude', form.value.longitude)
  if (selectedFile.value) formData.append('image', selectedFile.value)

  const result = await createReport(formData)

  if (result.error) {
    formError.value = result.error
  } else {
    showModal.value = false
    form.value = { title: '', description: '', latitude: '', longitude: '' }
    if (imagePreview.value) URL.revokeObjectURL(imagePreview.value)
    selectedFile.value = null
    imagePreview.value = null
    const data = await getMyReports()
    if (!data.error) reports.value = data
  }
}


</script>

<template>
  <div class="user-space">

    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-avatar">
        <div class="avatar">IB</div>
        <div class="avatar-info">
          <span class="avatar-name">{{ user?.nom }} {{ user?.prenom }}</span>
          <span class="avatar-role">Habitant</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <a href="#" class="nav-item active">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          Tableau de bord
        </a>
        <a href="#" class="nav-item">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
          Mes signalements
        </a>
        <a href="#" class="nav-item">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
          Notifications
          <span class="badge">3</span>
        </a>
        <a href="#" class="nav-item">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
          Mon profil
        </a>
        <a href="#" class="nav-item">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          Paramètres
        </a>
      </nav>

      <a @click.prevent="logout" href="/" class="sidebar-logout">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
        Se déconnecter
      </a>
    </aside>

    <!-- Contenu principal -->
    <main class="main-content">

      <header class="content-header">
        <div>
          <h1>Bonjour, Ibrahim</h1>
          <p class="header-subtitle">Voici un aperçu de vos signalements et activités.</p>
        </div>
        <button class="btn-new" @click="showModal = true">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M12 4v16m8-8H4"/></svg>
          Nouveau signalement
        </button>
      </header>

      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-label">Total signalements</span>
          <span class="stat-value">{{ reports.length }}</span>
        </div>
      </div>

      <!-- Signalements récents -->
      <section class="section">
        <h2 class="section-title">Mes signalements récents</h2>
        <div class="reports-list">

          <div v-if="reports.length === 0" class="report-empty">
            Aucun signalement pour le moment.
          </div>

          <div v-for="report in reports" :key="report.id" class="report-item">
            <div v-if="report.image_url" class="report-thumbnail-wrap">
              <img :src="imageUrl(report.image_url)!" class="report-thumbnail" :alt="report.title" />
            </div>
            <div v-else class="report-icon muted">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
            </div>
            <div class="report-info">
              <span class="report-title">{{ report.title }}</span>
              <span class="report-date">{{ report.description }}</span>
            </div>
            <span class="status-badge muted">{{ report.status ?? 'En attente' }}</span>
          </div>

        </div>
      </section>

    </main>

    <!-- Drawer nouveau signalement -->
    <Transition name="overlay">
      <div v-if="showModal" class="drawer-overlay" @click.self="closeDrawer"></div>
    </Transition>
    <Transition name="drawer">
      <div v-if="showModal" class="drawer">

        <!-- En-tête -->
        <div class="drawer-header">
          <div>
            <h3 class="drawer-title">Nouveau signalement</h3>
            <p class="drawer-subtitle">Renseignez les informations du problème</p>
          </div>
          <button class="drawer-close" @click="closeDrawer">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <form @submit.prevent="submitReport" class="drawer-form">

          <!-- Section 1 : Informations -->
          <div class="drawer-section">
            <h4 class="drawer-section-title">
              <span class="section-num">1</span> Informations
            </h4>
            <div class="form-group">
              <label>Titre <span class="required">*</span></label>
              <input v-model="form.title" type="text" placeholder="Ex: Nid de poule rue Pasteur" />
            </div>
            <div class="form-group">
              <label>Description <span class="required">*</span></label>
              <textarea v-model="form.description" rows="4" placeholder="Décrivez le problème en détail..."></textarea>
            </div>
          </div>

          <!-- Section 2 : Localisation -->
          <div class="drawer-section">
            <h4 class="drawer-section-title">
              <span class="section-num">2</span> Localisation
            </h4>

            <!-- Onglets Adresse / Carte -->
            <div class="location-tabs">
              <button type="button" :class="['loc-tab', { active: locationMode === 'address' }]" @click="locationMode = 'address'">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                Adresse
              </button>
              <button type="button" :class="['loc-tab', { active: locationMode === 'map' }]" @click="locationMode = 'map'">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 13l4.553 2.276A1 1 0 0021 21.382V10.618a1 1 0 00-.553-.894L15 7m0 13V7m0 0L9 4"/></svg>
                Choisir sur la carte
              </button>
            </div>

            <!-- Mode adresse -->
            <div v-if="locationMode === 'address'" class="address-search">
              <div class="address-input-row">
                <input v-model="addressQuery" type="text" placeholder="Ex: 12 rue Jean Jaurès" @keydown.enter.prevent="searchAddress" />
                <button type="button" class="btn-search" @click="searchAddress" :disabled="addressLoading">
                  <svg v-if="!addressLoading" xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                  <span v-else class="spinner"></span>
                </button>
              </div>
              <p v-if="addressError" class="location-hint location-hint--error">{{ addressError }}</p>
              <p v-if="addressResult" class="location-hint location-hint--set">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M5 13l4 4L19 7"/></svg>
                {{ addressResult }}
              </p>
            </div>

            <!-- Mode carte -->
            <div v-if="locationMode === 'map'">
              <div ref="mapPickerContainer" class="map-picker"></div>
              <p v-if="!form.latitude" class="location-hint">Cliquez sur la carte pour placer le signalement</p>
              <p v-else class="location-hint location-hint--set">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M5 13l4 4L19 7"/></svg>
                Position sélectionnée
              </p>
            </div>

            <!-- Coordonnées (toujours visibles, readonly si remplies auto) -->
            <div class="form-row" style="margin-top:0.75rem">
              <div class="form-group">
                <label style="font-size:0.72rem">Latitude</label>
                <input v-model="form.latitude" type="number" step="any" placeholder="48.7937" :readonly="!!form.latitude && locationMode !== 'address'" :class="{ 'input-readonly': !!form.latitude && locationMode !== 'address' }" />
              </div>
              <div class="form-group">
                <label style="font-size:0.72rem">Longitude</label>
                <input v-model="form.longitude" type="number" step="any" placeholder="2.3647" :readonly="!!form.longitude && locationMode !== 'address'" :class="{ 'input-readonly': !!form.longitude && locationMode !== 'address' }" />
              </div>
            </div>
          </div>

          <!-- Section 3 : Photo -->
          <div class="drawer-section">
            <h4 class="drawer-section-title">
              <span class="section-num">3</span> Photo <span class="optional">(optionnel)</span>
            </h4>
            <div
              class="drop-zone"
              :class="{ 'drop-zone--active': isDragging }"
              @dragover.prevent="isDragging = true"
              @dragleave="isDragging = false"
              @drop.prevent="onDrop"
              @click="($refs.fileInput as HTMLInputElement).click()"
            >
              <input ref="fileInput" type="file" accept="image/*" style="display:none" @change="onFileChange" />
              <template v-if="imagePreview">
                <img :src="imagePreview" class="drop-preview" :alt="selectedFile?.name" />
                <div class="drop-preview-info">
                  <span class="drop-zone-filename">{{ selectedFile?.name }}</span>
                  <button type="button" class="drop-zone-remove" @click.stop="removeFile">✕ Supprimer</button>
                </div>
              </template>
              <template v-else>
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m-4-4l4-4 4 4"/></svg>
                <span>Glisser-déposer ou <u>parcourir</u></span>
              </template>
            </div>
          </div>

          <p v-if="formError" class="form-error">{{ formError }}</p>

          <!-- Actions sticky en bas -->
          <div class="drawer-actions">
            <button type="button" class="btn-cancel" @click="closeDrawer">Annuler</button>
            <button type="submit" class="btn-submit">Envoyer le signalement</button>
          </div>

        </form>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
.user-space {
  display: grid;
  grid-template-columns: 260px 1fr;
  min-height: calc(100vh - 68px);
  background-color: var(--color-background);
}

/* ── Sidebar ── */
.sidebar {
  background-color: var(--color-primary);
  display: flex;
  flex-direction: column;
  padding: 2rem 1.25rem;
  gap: 0.5rem;
}

.sidebar-avatar {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0 0.5rem 1.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  margin-bottom: 1rem;
}

.avatar {
  width: 44px;
  height: 44px;
  background-color: rgba(255, 255, 255, 0.18);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-title);
  font-size: 0.95rem;
  font-weight: 700;
  color: #ffffff;
  flex-shrink: 0;
}

.avatar-info {
  display: flex;
  flex-direction: column;
}

.avatar-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: #ffffff;
}

.avatar-role {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.55);
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.875rem;
  border-radius: 8px;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.65);
  text-decoration: none;
  transition: background-color 0.15s, color 0.15s;
  position: relative;
}

.nav-item:hover {
  background-color: rgba(255, 255, 255, 0.08);
  color: #ffffff;
}

.nav-item.active {
  background-color: rgba(255, 255, 255, 0.14);
  color: #ffffff;
  font-weight: 600;
}

.badge {
  margin-left: auto;
  background-color: #e05a2b;
  color: #ffffff;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
}

.sidebar-logout {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.875rem;
  border-radius: 8px;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.45);
  text-decoration: none;
  transition: background-color 0.15s, color 0.15s;
  margin-top: 1rem;
}

.sidebar-logout:hover {
  background-color: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.85);
}

/* ── Main ── */
.main-content {
  padding: 2.5rem 2.75rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.content-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.content-header h1 {
  font-family: var(--font-title);
  font-size: 1.75rem;
  color: var(--color-primary);
  margin-bottom: 0.2rem;
}

.header-subtitle {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.btn-new {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: var(--color-primary);
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 0.7rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
  white-space: nowrap;
}

.btn-new:hover {
  opacity: 0.85;
}

/* ── Stats ── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.stat-card {
  background-color: #ffffff;
  border: 1.5px solid var(--color-border);
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stat-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.stat-value {
  font-family: var(--font-title);
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-primary);
}

.stat-value.accent-orange { color: #e05a2b; }
.stat-value.accent-green  { color: #2b9e5a; }
.stat-value.accent-muted  { color: var(--color-text-muted); }

/* ── Section ── */
.section-title {
  font-family: var(--font-title);
  font-size: 1.1rem;
  color: var(--color-primary);
  margin-bottom: 1rem;
}

.reports-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.report-item {
  background-color: #ffffff;
  border: 1.5px solid var(--color-border);
  border-radius: 10px;
  padding: 1rem 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.report-icon {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.report-icon.orange { background-color: rgba(224, 90, 43, 0.1); color: #e05a2b; }
.report-icon.green  { background-color: rgba(43, 158, 90, 0.1); color: #2b9e5a; }
.report-icon.muted  { background-color: rgba(4, 44, 83, 0.07); color: var(--color-text-muted); }

.report-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  flex: 1;
}

.report-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
}

.report-date {
  font-size: 0.775rem;
  color: var(--color-text-muted);
}

.status-badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.3rem 0.75rem;
  border-radius: 999px;
  white-space: nowrap;
}

.report-empty {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  padding: 1rem 0;
}

.status-badge.orange { background-color: rgba(224, 90, 43, 0.1); color: #e05a2b; }
.status-badge.green  { background-color: rgba(43, 158, 90, 0.1); color: #2b9e5a; }
.status-badge.muted  { background-color: rgba(4, 44, 83, 0.07); color: var(--color-text-muted); }

/* ── Drawer ── */
.drawer-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(4, 44, 83, 0.45);
  z-index: 200;
}

.drawer {
  position: fixed;
  top: 68px;
  right: 0;
  bottom: 0;
  width: 480px;
  background: #ffffff;
  z-index: 201;
  display: flex;
  flex-direction: column;
  box-shadow: -8px 0 40px rgba(4, 44, 83, 0.15);
}

.drawer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1.75rem 1.75rem 1.25rem;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.drawer-title {
  font-family: var(--font-title);
  font-size: 1.3rem;
  color: var(--color-primary);
  margin-bottom: 0.15rem;
}

.drawer-subtitle {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.drawer-close {
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 6px;
  transition: background-color 0.15s;
  flex-shrink: 0;
}
.drawer-close:hover { background-color: rgba(4, 44, 83, 0.07); color: var(--color-primary); }

.drawer-form {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  padding-bottom: 0;
}

.drawer-section {
  padding: 1.25rem 1.75rem;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.drawer-section-title {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
}

.section-num {
  width: 20px;
  height: 20px;
  background-color: var(--color-primary);
  color: #fff;
  border-radius: 50%;
  font-size: 0.7rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.optional {
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  font-size: 0.78rem;
}

.required { color: #e05a2b; margin-left: 1px; }

/* Onglets localisation */
.location-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border: 1.5px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}

.loc-tab {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.6rem;
  font-size: 0.8rem;
  font-weight: 600;
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}
.loc-tab:first-child { border-right: 1.5px solid var(--color-border); }
.loc-tab:hover { background-color: rgba(4, 44, 83, 0.04); }
.loc-tab.active { background-color: var(--color-primary); color: #ffffff; }

/* Recherche adresse */
.address-search { display: flex; flex-direction: column; gap: 0.5rem; }

.address-input-row {
  display: flex;
  gap: 0.5rem;
}

.address-input-row input { flex: 1; }

.btn-search {
  width: 40px;
  height: 40px;
  background-color: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: opacity 0.2s;
}
.btn-search:hover { opacity: 0.85; }
.btn-search:disabled { opacity: 0.5; cursor: default; }

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  display: inline-block;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Carte picker */
.map-picker {
  width: 100%;
  height: 240px;
  border-radius: 8px;
  overflow: hidden;
  border: 1.5px solid var(--color-border);
  cursor: crosshair;
}

/* Champs communs */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.875rem;
}

label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-primary);
}

input, textarea {
  background-color: var(--color-background);
  border: 1.5px solid var(--color-border);
  border-radius: 8px;
  padding: 0.65rem 0.875rem;
  font-size: 0.875rem;
  color: var(--color-text);
  outline: none;
  transition: border-color 0.2s;
  font-family: var(--font-body);
  resize: vertical;
}
input:focus, textarea:focus { border-color: var(--color-primary); }

.input-readonly {
  background-color: #f3f4f6 !important;
  color: var(--color-text-muted) !important;
  cursor: default;
}

.location-hint {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  gap: 0.3rem;
}
.location-hint--set   { color: #059669; font-weight: 500; }
.location-hint--error { color: #dc2626; }

/* Drop zone */
.drop-zone {
  border: 1.5px dashed var(--color-border);
  border-radius: 8px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: border-color 0.2s, background-color 0.2s;
  background-color: var(--color-background);
}
.drop-zone:hover, .drop-zone--active {
  border-color: var(--color-primary);
  background-color: rgba(4, 44, 83, 0.04);
}

.drop-zone-filename {
  font-size: 0.85rem;
  color: var(--color-text);
  font-weight: 500;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drop-zone-remove {
  background: none;
  border: none;
  font-size: 0.85rem;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
}
.drop-zone-remove:hover { color: #c0392b; }

.form-error { font-size: 0.8rem; color: #c0392b; padding: 0 1.75rem; }

/* Actions sticky */
.drawer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.25rem 1.75rem;
  border-top: 1px solid var(--color-border);
  background: #ffffff;
  flex-shrink: 0;
}

.btn-cancel {
  background: none;
  border: 1.5px solid var(--color-border);
  border-radius: 8px;
  padding: 0.65rem 1.25rem;
  font-size: 0.875rem;
  color: var(--color-text-muted);
  cursor: pointer;
}

.btn-submit {
  background-color: var(--color-primary);
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 0.65rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s;
}
.btn-submit:hover { opacity: 0.85; }

/* Transitions */
.overlay-enter-active, .overlay-leave-active { transition: opacity 0.25s ease; }
.overlay-enter-from, .overlay-leave-to { opacity: 0; }

.drawer-enter-active, .drawer-leave-active { transition: transform 0.3s cubic-bezier(0.4,0,0.2,1); }
.drawer-enter-from, .drawer-leave-to { transform: translateX(100%); }

.drop-preview {
  width: 72px;
  height: 72px;
  object-fit: cover;
  border-radius: 6px;
  flex-shrink: 0;
}

.drop-preview-info {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  flex: 1;
  overflow: hidden;
}

.report-thumbnail-wrap {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
}

.report-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
