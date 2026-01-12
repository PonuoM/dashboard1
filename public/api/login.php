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
                $response['success'] = true;
                $response['message'] = 'Login successful';
                // You might return user info or token here
                 $response['user'] = [
                    'id' => $user['id'],
                    'username' => $user['username']
                ];
            } else {
                $response['message'] = 'Invalid password';
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
