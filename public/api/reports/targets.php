<?php
/**
 * Sales Targets API
 * 
 * GET: Fetch targets for specified month/year
 * POST: Save/Update target for a user
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

include '../db.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        // Get parameters
        $month = isset($_GET['month']) ? intval($_GET['month']) : date('n');
        $year = isset($_GET['year']) ? intval($_GET['year']) : date('Y');
        $company_id = isset($_GET['company_id']) ? intval($_GET['company_id']) : 0;

        // Get all Telesale/Supervisor users with their targets
        $sql = "
            SELECT 
                u.id AS user_id,
                u.first_name,
                u.role,
                st.target_amount
            FROM users u
            LEFT JOIN sales_targets st ON u.id = st.user_id 
                AND st.month = ? AND st.year = ?
            WHERE u.role IN ('Telesale', 'Supervisor Telesale')
                AND u.company_id = ?
                AND u.status = 'Active'
            ORDER BY u.role, u.first_name
        ";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("iii", $month, $year, $company_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $users = [];
        while ($row = $result->fetch_assoc()) {
            $users[] = [
                'user_id' => intval($row['user_id']),
                'first_name' => $row['first_name'],
                'role' => $row['role'],
                'target_amount' => $row['target_amount'] !== null ? floatval($row['target_amount']) : null
            ];
        }
        $stmt->close();

        echo json_encode([
            'success' => true,
            'data' => $users,
            'filters' => [
                'month' => $month,
                'year' => $year,
                'company_id' => $company_id
            ]
        ]);

    } elseif ($method === 'POST') {
        // Get POST data
        $input = json_decode(file_get_contents('php://input'), true);
        
        $user_id = isset($input['user_id']) ? intval($input['user_id']) : 0;
        $month = isset($input['month']) ? intval($input['month']) : 0;
        $year = isset($input['year']) ? intval($input['year']) : 0;
        $target_amount = isset($input['target_amount']) ? floatval($input['target_amount']) : 0;

        if ($user_id <= 0 || $month < 1 || $month > 12 || $year < 2020) {
            echo json_encode(['success' => false, 'message' => 'Invalid parameters']);
            exit;
        }

        // Upsert target (INSERT or UPDATE)
        $sql = "
            INSERT INTO sales_targets (user_id, month, year, target_amount)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE target_amount = VALUES(target_amount), updated_at = CURRENT_TIMESTAMP
        ";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("iiid", $user_id, $month, $year, $target_amount);
        
        if ($stmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => 'Target saved successfully',
                'data' => [
                    'user_id' => $user_id,
                    'month' => $month,
                    'year' => $year,
                    'target_amount' => $target_amount
                ]
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to save target']);
        }
        $stmt->close();

    } else {
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    }

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}

$conn->close();
?>
