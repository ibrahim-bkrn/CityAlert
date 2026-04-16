import { apiFetch } from './index'

export function getAdminReports(status: string = 'pending') {
    return apiFetch(`/admin/reports?status=${status}`, {
        method: "GET"
    })
}

export function approveReport(id: number) {
    return apiFetch(`/admin/reports/${id}/approve`, {
        method: "PUT"
    })
}

export function rejectReport(id: number) {
    return apiFetch(`/admin/reports/${id}/reject`, {
        method: "PUT"
    })
}

export function resolveReport(id: number) {
    return apiFetch(`/admin/reports/${id}/resolve`, {
        method: "PUT"
    })
}

export function getStats() {
    return apiFetch("/stats", {
        method: "GET"
    })
}

export function getStatsStatus() {
    return apiFetch("/stats/status", {
        method: "GET"
    })
}

export function getStatsPriority() {
    return apiFetch("/stats/priority", {
        method: "GET"
    })
}
