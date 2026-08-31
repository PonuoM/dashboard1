<?php
include 'db.php';

// Prepare response
$response = ['success' => false, 'message' => 'Invalid request'];

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Get POST data (JSON or Form)
    $input = json_decode(file_get_contents("php://input"), true);
    
    $username = $input['username'] ?? '';
    $password = $input['password'] ?? '';

    if (!empty($username) && !empty($password)) {
        // Prepare statement to prevent SQL injection
        $stmt = $conn->prepare("SELECT * FROM users WHERE username = ?");
        $stmt->bind_param("s", $username);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows > 0) {
            $user = $result->fetch_assoc();
            // Verify password (plaintext as requested)
            if ($password === $user['password']) {
                // Only allow specific roles to access Dashboard (case-insensitive)
                $allowed_roles = ['admin control', 'supervisor telesale', 'telesale', 'admin page', 'backoffice'];
                if (!in_array(strtolower($user['role']), $allowed_roles)) {
                    $response['message'] = 'ไม่มีสิทธิ์เข้าใช้งาน Dashboard';
                } else {
                    $response['success'] = true;
                    $response['message'] = 'Login successful';
                    // Return user info including company_id for data filtering
                    $response['user'] = [
                        'id' => $user['id'],
                        'username' => $user['username'],
                        'first_name' => $user['first_name'],
                        'last_name' => $user['last_name'],
                        'role' => $user['role'],
                        'company_id' => $user['company_id']
                    ];
                }
            } else {
                $response['message'] = 'รหัสผ่านไม่ถูกต้อง';
            }
        } else {
            $response['message'] = 'User not found';
        }
        $stmt->close();
    } else {
        $response['message'] = 'Missing username or password';
    }
}

// Return JSON
header('Content-Type: application/json');
echo json_encode($response);
$conn->close();
?>
