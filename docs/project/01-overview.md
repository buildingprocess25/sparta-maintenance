# Overview

SPARTA Maintenance adalah aplikasi internal untuk pelaporan maintenance toko, checklist kondisi, checklist preventif, approval berjenjang, realisasi biaya, arsip PDF, PJUM, dan notifikasi proses bisnis.

## Tujuan Bisnis

- BMS membuat dan menyelesaikan laporan maintenance toko.
- BMC melakukan review estimasi, penyelesaian pekerjaan, dan membuat PJUM.
- BNM Manager melakukan final approval laporan dan approval PJUM.
- Admin memantau data global, mengelola master data, dan melakukan intervensi pada laporan selesai jika ada kebutuhan koreksi resmi.

## Role Utama

| Role | Fokus |
| --- | --- |
| `BMS` | Membuat laporan, mengisi checklist, estimasi, mulai kerja, dan submit penyelesaian. |
| `BMC` | Review pekerjaan dan PJUM dalam scope cabang/area. |
| `BNM_MANAGER` | Final approval laporan dan approval PJUM dalam scope cabang/area. |
| `ADMIN` | Monitoring global, master data, settings, intervensi, dan operasional sistem. |

## Istilah Domain

| Istilah | Arti |
| --- | --- |
| Laporan maintenance | Laporan kondisi toko dan pekerjaan perbaikan. |
| Checklist kondisi | Checklist item kondisi toko, termasuk foto dan catatan. |
| Preventif | Checklist berkala per triwulan untuk memastikan toko sudah dicek. |
| Estimasi | Rencana biaya/material sebelum pekerjaan. |
| Realisasi | Biaya/material aktual setelah pekerjaan. |
| PJUM | Pertanggungjawaban uang muka BMS. |
| Area cabang | Sub-scope lama seperti BALARAJA/SERANG yang tetap dipakai setelah cabang digabung. |
| Branch scope | Cabang utama yang boleh diakses user non-admin. |
| `HEAD OFFICE` | Cabang development/testing yang dikecualikan dari tampilan global production admin. |

## Kondisi Dashboard Saat Ini

- `ADMIN`, `BMC`, dan `BNM_MANAGER` memakai dashboard baru.
- `BMS` tetap memakai workflow operasional lama pada route `/reports`.
- UI dashboard baru dibuat compact, table-first, dan menghindari card berlebihan.
- Status laporan dan status PJUM harus memakai label global dari `lib/report-status.ts` dan `lib/pjum-status.ts`.
