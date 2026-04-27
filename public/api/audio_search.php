<?php
/**
 * Audio Search Proxy for Dashboard
 * 
 * Searches Google Drive for voice recordings matching call metadata
 * then redirects to /voicecall/audio_proxy.php for playback.
 * 
 * Supports two folder structures:
 * 1. myreco/myrecord/ — all files in one folder, named: YYYYMMDD_HHMMSS_ID-%2Bphone1-%2Bphone2-DIR.wav
 * 2. Company = X/YYYYMM/YYYYMMDD/ — files organized by date
 * 
 * Parameters:
 * - phone1: first phone number (call_from)
 * - phone2: second phone number (call_to)
 * - date:   call date (YYYY-MM-DD)
 * - company_id: company ID (1, 6, 7, etc.)
 * - time:   (optional) start time HH:MM:SS for precise matching
 */

header("Access-Control-Allow-Origin: *");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$phone1     = $_GET['phone1'] ?? '';
$phone2     = $_GET['phone2'] ?? '';
$date       = $_GET['date'] ?? '';
$company_id = $_GET['company_id'] ?? '1';
$time       = $_GET['time'] ?? '';

if ((empty($phone1) && empty($phone2)) || empty($date)) {
    http_response_code(400);
    header("Content-Type: application/json");
    echo json_encode(['error' => 'Missing phone or date']);
    exit;
}

// ── Config ──
$apiKey       = 'AIzaSyCCIywRsoHuBzVTm-B-FA8N7VzAcECIEBE';
$rootFolderId = '135GAP4FYM7b7LwVaVwdBHPFYUwn7T5rx';

// ── Helpers ──
function phoneSuffix($phone) {
    $clean = preg_replace('/[^0-9]/', '', $phone);
    // Filenames use %2B66xxx format, so build: %2B66 + last 9 digits
    if (strlen($clean) >= 9) {
        $last9 = substr($clean, -9);
        return '%2B66' . $last9;
    }
    return $clean;
}

function driveSearch($parentId, $extraQuery, $apiKey) {
    $q = "'" . $parentId . "' in parents and trashed=false";
    if ($extraQuery) $q .= " and " . $extraQuery;
    $url = "https://www.googleapis.com/drive/v3/files?" . http_build_query([
        'q' => $q, 'key' => $apiKey,
        'fields' => 'files(id,name,size)', 'pageSize' => 500, 'orderBy' => 'name'
    ]);
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_SSL_VERIFYPEER => false, CURLOPT_TIMEOUT => 15
    ]);
    $resp = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($httpCode !== 200) return [];
    return json_decode($resp, true)['files'] ?? [];
}

// ── Cache (file-based, 24h TTL) ──
$cacheFile = sys_get_temp_dir() . '/gdrive_audio_cache.json';
$cache = [];
if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < 86400) {
    $cache = json_decode(file_get_contents($cacheFile), true) ?: [];
}
function cacheGet($key) { global $cache; return $cache[$key] ?? null; }
function cacheSet($key, $val) {
    global $cache, $cacheFile;
    $cache[$key] = $val;
    @file_put_contents($cacheFile, json_encode($cache));
}

// ── Parse date (handle UTC offset: try both given date and +1 day) ──
$ts = strtotime($date);
if (!$ts) { http_response_code(400); die('Invalid date'); }
$dayStr     = date('Ymd', $ts);           // 20260120
$dayStrNext = date('Ymd', $ts + 86400);   // 20260121
$monthStr   = date('Ym', $ts);            // 202601

$suffix1 = phoneSuffix($phone1);
$suffix2 = phoneSuffix($phone2);

// ── Step 1: Find Company folder ──
$ck = "co_{$company_id}";
$companyFid = cacheGet($ck);
if (!$companyFid) {
    $res = driveSearch($rootFolderId, "name='Company = {$company_id}' and mimeType='application/vnd.google-apps.folder'", $apiKey);
    if (empty($res)) { http_response_code(404); die("Company folder not found"); }
    $companyFid = $res[0]['id'];
    cacheSet($ck, $companyFid);
}

// ── Step 2: Try "myreco/myrecord" folder first (flat structure) ──
$myrecoKey = "myreco_{$company_id}";
$myrecordFid = cacheGet($myrecoKey);
if (!$myrecordFid) {
    $myreco = driveSearch($companyFid, "name='myreco' and mimeType='application/vnd.google-apps.folder'", $apiKey);
    if (!empty($myreco)) {
        $myrecord = driveSearch($myreco[0]['id'], "name='myrecord' and mimeType='application/vnd.google-apps.folder'", $apiKey);
        if (!empty($myrecord)) {
            $myrecordFid = $myrecord[0]['id'];
            cacheSet($myrecoKey, $myrecordFid);
        }
    }
}

$found = null;

if ($myrecordFid) {
    $daysToSearch = [$dayStr, $dayStrNext];
    
    foreach ($daysToSearch as $day) {
        // Best: search with BOTH phones + date (most precise match)
        if ($suffix1 && $suffix2) {
            $files = driveSearch($myrecordFid, "name contains '{$suffix1}' and name contains '{$suffix2}' and name contains '{$day}'", $apiKey);
            if (!empty($files)) { $found = $files; break; }
        }
        // Fallback: single phone + date
        if (!$found && $suffix1) {
            $files = driveSearch($myrecordFid, "name contains '{$suffix1}' and name contains '{$day}'", $apiKey);
            if (!empty($files)) { $found = $files; break; }
        }
        if (!$found && $suffix2) {
            $files = driveSearch($myrecordFid, "name contains '{$suffix2}' and name contains '{$day}'", $apiKey);
            if (!empty($files)) { $found = $files; break; }
        }
    }
}

// ── Step 3: Fallback — try YYYYMM/YYYYMMDD folder structure ──
if (empty($found)) {
    $daysToSearch = [$dayStr, $dayStrNext];
    
    foreach ($daysToSearch as $day) {
        $mStr = substr($day, 0, 6);
        $mk = "mo_{$company_id}_{$mStr}";
        $monthFid = cacheGet($mk);
        if (!$monthFid) {
            $res = driveSearch($companyFid, "name='{$mStr}' and mimeType='application/vnd.google-apps.folder'", $apiKey);
            if (!empty($res)) { $monthFid = $res[0]['id']; cacheSet($mk, $monthFid); }
        }
        if (!$monthFid) continue;
        
        $dk = "dy_{$company_id}_{$day}";
        $dayFid = cacheGet($dk);
        if (!$dayFid) {
            $res = driveSearch($monthFid, "name='{$day}' and mimeType='application/vnd.google-apps.folder'", $apiKey);
            if (!empty($res)) { $dayFid = $res[0]['id']; cacheSet($dk, $dayFid); }
        }
        if (!$dayFid) continue;
        
        // Search by phone
        if ($suffix1) {
            $files = driveSearch($dayFid, "name contains '{$suffix1}'", $apiKey);
            if (!empty($files)) { $found = $files; break; }
        }
        if ($suffix2) {
            $files = driveSearch($dayFid, "name contains '{$suffix2}'", $apiKey);
            if (!empty($files)) { $found = $files; break; }
        }
    }
}

// ── Not found ──
if (empty($found)) {
    http_response_code(404);
    header("Content-Type: application/json");
    echo json_encode([
        'error' => 'Audio file not found',
        'searched' => [
            'days' => [$dayStr, $dayStrNext],
            'phone1' => $suffix1,
            'phone2' => $suffix2,
            'company' => $company_id
        ]
    ]);
    exit;
}

// ── Pick best match (narrow by time if multiple results) ──
$best = $found[0];
if (count($found) > 1 && $time) {
    $searchTime = str_replace(':', '', substr($time, 0, 8)); // HHMMSS
    foreach ($found as $f) {
        if (strpos($f['name'], $searchTime) !== false) {
            $best = $f;
            break;
        }
    }
}

// ── Stream audio via audio_proxy.php (include directly to bypass SPA routing) ──
$_GET['id'] = $best['id'];
include(dirname($_SERVER['DOCUMENT_ROOT']) . '/voicecall/audio_proxy.php');
exit;
