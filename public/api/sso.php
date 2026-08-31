<?php
/**
 * SSO Token Verification Endpoint
 *
 * รับ token ที่ CRM ออกไว้ (ตาราง user_tokens ใช้ร่วมกัน) → verify กับ DB
 * → คืน user object shape เดียวกับ login.php เพื่อให้ frontend ใช้ต่อได้ทันที
 *
 * Input:  token (JSON body, form POST, หรือ ?token= ก็ได้)
 * Output: { success, message, user? }
 */
include 'db.php';

header('Content-Type: application/json');

// Read token from JSON body / form / query string
$token = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (is_array($input) && isset($input['token'])) {
        $token = trim($input['token']);
    } elseif (isset($_POST['token'])) {
        $token = trim($_POST['token']);
    }
}
if ($token === '' && isset($_GET['token'])) {
    $token = trim($_GET['token']);
}

$response = ['success' => false, 'message' => 'Missing token'];

if ($token !== '') {
    $stmt = $conn->prepare("
        SELECT u.id, u.username, u.first_name, u.last_name, u.role, u.company_id, u.status
        FROM user_tokens ut
        JOIN users u ON u.id = ut.user_id
        WHERE ut.token = ? AND ut.expires_at > NOW()
        LIMIT 1
    ");
    $stmt->bind_param('s', $token);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$user) {
        $response['message'] = 'Token ไม่ถูกต้องหรือหมดอายุ';
    } elseif ($user['status'] !== null && strtolower($user['status']) !== 'active') {
        $response['message'] = 'บัญชีถูกระงับการใช้งาน';
    } else {
        // Same role whitelist as login.php (case-insensitive)
        $allowed_roles = ['admin control', 'supervisor telesale', 'telesale', 'admin page', 'backoffice'];
        if (!in_array(strtolower($user['role']), $allowed_roles)) {
            $response['message'] = 'ไม่มีสิทธิ์เข้าใช้งาน Dashboard';
        } else {
            $response = [
                'success' => true,
                'message' => 'Login successful',
                'user' => [
                    'id' => $user['id'],
                    'username' => $user['username'],
                    'first_name' => $user['first_name'],
                    'last_name' => $user['last_name'],
                    'role' => $user['role'],
                    'company_id' => $user['company_id']
                ]
            ];
        }
    }
}

echo json_encode($response);
$conn->close();
?>
