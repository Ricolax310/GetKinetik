# GEODNET: Exact Coordinate Duplicates Summary Report

This summary was compiled by the Kinetik Bureau using public GNSS reference network snapshots. 

In a permanent RTK reference network, two physical antennas cannot share the exact same coordinates down to the meter. These entries suggest an **upstream registration syncing lag** or a location override override anomaly within the network's database, rather than hardware-level spoofing.

You can paste this list directly into DMs to illustrate the registration anomalies we discussed.

---

### 📍 The Top 10 Exact-Coordinate Duplicate Groups

#### **Group 1 (Delft, Netherlands)**
* **Coordinates:** `51.986433, 4.385757`
* **Count:** 6 active RTK stations
* **Station Names:** 
  * `****0DLF4`
  * `****0DLF1`
  * `****0DLF8`
  * `****3DLFV`
  * `****0DLF6`
  * `****0DLF5`

#### **Group 2 (Charlotte, NC, USA)**
* **Coordinates:** `35.182835, -80.916096`
* **Count:** 2 active RTK stations (Exact name ID clash)
* **Station Names:**
  * `****0BBF0`
  * `****0BBF0`

#### **Group 3 (Riau, Indonesia)**
* **Coordinates:** `1.154609, 101.241756`
* **Count:** 2 active RTK stations (Default ID clash)
* **Station Names:**
  * `****00000`
  * `****00000`

#### **Group 4 (Drenthe, Netherlands)**
* **Coordinates:** `52.915025, 6.602801`
* **Count:** 2 active RTK stations
* **Station Names:**
  * `****0WSRA`
  * `****0WSRT`

#### **Group 5 (Ankeny, IA, USA)**
* **Coordinates:** `41.612989, -93.537405`
* **Count:** 2 active RTK stations (Exact name clash)
* **Station Names:**
  * `****E2162`
  * `****E2162`

#### **Group 6 (San Antonio, TX, USA)**
* **Coordinates:** `29.396936, -98.430184`
* **Count:** 2 active RTK stations (Exact name clash)
* **Station Names:**
  * `****CAE6C`
  * `****CAE6C`

#### **Group 7 (Shallotte, NC, USA)**
* **Coordinates:** `33.94714, -78.314998`
* **Count:** 2 active RTK stations (Exact name clash)
* **Station Names:**
  * `****20C40`
  * `****20C40`

#### **Group 8 (Clay City, KY, USA)**
* **Coordinates:** `37.957868, -83.715804`
* **Count:** 2 active RTK stations (Exact name clash)
* **Station Names:**
  * `****D2EC4`
  * `****D2EC4`

#### **Group 9 (Waltham, MA, USA)**
* **Coordinates:** `42.37275, -71.187825`
* **Count:** 2 active RTK stations (Exact name clash)
* **Station Names:**
  * `****C6D12`
  * `****C6D12`

#### **Group 10 (Tryon, NC, USA)**
* **Coordinates:** `35.209171, -82.24811`
* **Count:** 2 active RTK stations (Exact name clash)
* **Station Names:**
  * `****6E64A`
  * `****6E64A`

---

### 🛡️ How Kinetik Can Help Solve This Easily

Instead of making changes to your central registration database, Geodnet can query Kinetik’s neutral verify API:
1. When a station joins, Kinetik signs a local, hardware-sealed Proof of Origin.
2. The score validates if the physical device signature matches an existing node, stopping duplicate database registrations before they hit your upstream server.
