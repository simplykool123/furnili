<?php
/**
 * Test Data Generator for Furnili Management System
 * This script populates the database with realistic test data
 */

require_once 'config/database.php';
require_once 'includes/functions.php';

// Only run if explicitly requested
if (!isset($_GET['generate']) || $_GET['generate'] !== 'test_data') {
    die('Access denied. Add ?generate=test_data to run this script.');
}

$db = Database::connect();

echo "<h2>Generating Test Data for Furnili Management System</h2>";

try {
    // 1. Add test users (if not exists)
    echo "<h3>1. Adding Test Users...</h3>";
    
    $testUsers = [
        ['admin', 'admin@furnili.com', 'Admin User', 'admin', 'EMP001'],
        ['manager1', 'manager@furnili.com', 'Rajesh Kumar', 'manager', 'EMP002'],
        ['store1', 'storekeeper@furnili.com', 'Priya Singh', 'storekeeper', 'EMP003'],
        ['user1', 'user1@furnili.com', 'Amit Sharma', 'user', 'EMP004'],
        ['user2', 'user2@furnili.com', 'Neha Patel', 'user', 'EMP005']
    ];
    
    foreach ($testUsers as $userData) {
        $stmt = $db->prepare("SELECT id FROM users WHERE username = ?");
        $stmt->execute([$userData[0]]);
        
        if (!$stmt->fetch()) {
            $stmt = $db->prepare("
                INSERT INTO users (username, email, password, name, role, employee_id, is_active, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, 1, NOW())
            ");
            $stmt->execute([
                $userData[0],
                $userData[1],
                password_hash('password123', PASSWORD_DEFAULT),
                $userData[2],
                $userData[3],
                $userData[4]
            ]);
            echo "Added user: {$userData[2]} ({$userData[3]})<br>";
        }
    }
    
    // 2. Add test products
    echo "<h3>2. Adding Test Products...</h3>";
    
    $testProducts = [
        ['Steel Rods - 12mm', 'Construction Materials', 'Tata Steel', '12mm', '12mm', 45.50, 500, 50, 'pieces'],
        ['Cement Bags - 50kg', 'Construction Materials', 'UltraTech', '50kg', null, 385.00, 200, 20, 'bags'],
        ['Wooden Planks - Teak', 'Furniture Materials', 'Burma Teak', '8ft x 1ft', '1 inch', 1250.00, 150, 25, 'pieces'],
        ['Screws - Phillips Head', 'Hardware', 'Bosch', '25mm', null, 2.25, 5000, 500, 'pieces'],
        ['Paint - Asian Paints', 'Paints & Coatings', 'Asian Paints', '1 Liter', null, 285.00, 80, 10, 'liters'],
        ['Wire Mesh - Galvanized', 'Construction Materials', 'Jindal', '6ft x 4ft', '2mm', 125.00, 100, 20, 'sheets'],
        ['PVC Pipes - 4 inch', 'Plumbing', 'Supreme', '4 inch', '4mm', 95.00, 75, 15, 'pieces'],
        ['Glass Sheets - Clear', 'Glass & Glazing', 'Guardian', '4ft x 3ft', '5mm', 450.00, 50, 10, 'sheets'],
        ['Marble Tiles - White', 'Flooring', 'Kajaria', '2ft x 2ft', '15mm', 85.00, 300, 50, 'pieces'],
        ['LED Bulbs - 9W', 'Electrical', 'Philips', '9 Watts', null, 125.00, 200, 25, 'pieces']
    ];
    
    foreach ($testProducts as $productData) {
        $stmt = $db->prepare("SELECT id FROM products WHERE name = ?");
        $stmt->execute([$productData[0]]);
        
        if (!$stmt->fetch()) {
            $sku = generateSKU($productData[0]);
            
            $stmt = $db->prepare("
                INSERT INTO products (name, category, brand, size, thickness, price_per_unit, 
                                    current_stock, min_stock, unit, sku, is_active, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())
            ");
            $stmt->execute([
                $productData[0], $productData[1], $productData[2], $productData[3],
                $productData[4], $productData[5], $productData[6], $productData[7],
                $productData[8], $sku
            ]);
            
            $productId = $db->lastInsertId();
            
            // Add initial stock movement
            recordStockMovement($productId, 'in', $productData[6], $productData[5], 'Initial stock - Test data');
            
            echo "Added product: {$productData[0]} (Stock: {$productData[6]})<br>";
        }
    }
    
    // 3. Add test material requests
    echo "<h3>3. Adding Test Material Requests...</h3>";
    
    $testRequests = [
        ['Office renovation materials needed', 'high', 'pending', 2, 'Need steel rods and cement for office renovation project'],
        ['Furniture workshop supplies', 'medium', 'approved', 3, 'Wooden planks and screws for furniture production'],
        ['Electrical maintenance items', 'low', 'completed', 4, 'LED bulbs and wiring materials for building maintenance'],
        ['Bathroom renovation supplies', 'high', 'pending', 2, 'PVC pipes, tiles, and fittings for washroom upgrade'],
        ['Painting project materials', 'medium', 'approved', 5, 'Paint and brushes for building exterior painting']
    ];
    
    foreach ($testRequests as $requestData) {
        $stmt = $db->prepare("
            INSERT INTO material_requests (description, priority, status, user_id, notes, created_at) 
            VALUES (?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([
            $requestData[0], $requestData[1], $requestData[2], $requestData[3], $requestData[4]
        ]);
        echo "Added material request: {$requestData[0]} ({$requestData[2]})<br>";
    }
    
    // 4. Add test petty cash expenses
    echo "<h3>4. Adding Test Petty Cash Expenses...</h3>";
    
    $testExpenses = [
        ['2025-01-15', 'Office supplies purchase', 1250.00, 0, 'Stationary Shop', 'Rajesh Kumar', 'Office Supplies'],
        ['2025-01-16', 'Fuel for delivery vehicle', 800.00, 0, 'Petrol Pump', 'Amit Sharma', 'Transportation'],
        ['2025-01-17', 'Team lunch expense', 2400.00, 0, 'Restaurant', 'Neha Patel', 'Meals'],
        ['2025-01-18', 'Client advance payment', 15000.00, 1, 'ABC Construction', 'Admin User', 'Client Payment'],
        ['2025-01-19', 'Maintenance tools', 650.00, 0, 'Hardware Store', 'Priya Singh', 'Maintenance'],
        ['2025-01-20', 'Monthly rent income', 25000.00, 1, 'Property Rent', 'Admin User', 'Rent Income'],
        ['2025-01-21', 'Internet bill payment', 1200.00, 0, 'ISP Provider', 'Rajesh Kumar', 'Utilities'],
        ['2025-01-22', 'Raw material purchase', 8500.00, 0, 'Supplier Ltd', 'Priya Singh', 'Materials']
    ];
    
    foreach ($testExpenses as $expenseData) {
        $stmt = $db->prepare("
            INSERT INTO petty_cash_expenses (expense_date, description, amount, is_credit, 
                                           paid_to, paid_by, category, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([
            $expenseData[0], $expenseData[1], $expenseData[2], $expenseData[3],
            $expenseData[4], $expenseData[5], $expenseData[6]
        ]);
        
        $type = $expenseData[3] ? 'Income' : 'Expense';
        echo "Added petty cash {$type}: {$expenseData[1]} (₹{$expenseData[2]})<br>";
    }
    
    // 5. Add test attendance records
    echo "<h3>5. Adding Test Attendance Records...</h3>";
    
    $userIds = [2, 3, 4, 5]; // Manager, Storekeeper, Users
    $dates = [
        '2025-01-15', '2025-01-16', '2025-01-17', '2025-01-18', '2025-01-19',
        '2025-01-20', '2025-01-21', '2025-01-22', '2025-01-23'
    ];
    
    foreach ($dates as $date) {
        foreach ($userIds as $userId) {
            // Random check-in time between 9:00 AM and 10:00 AM
            $checkInHour = rand(9, 10);
            $checkInMinute = rand(0, 59);
            $checkIn = "{$date} {$checkInHour}:" . sprintf('%02d', $checkInMinute) . ":00";
            
            // Random check-out time between 5:30 PM and 7:00 PM
            $checkOutHour = rand(17, 19);
            $checkOutMinute = rand(0, 59);
            $checkOut = "{$date} {$checkOutHour}:" . sprintf('%02d', $checkOutMinute) . ":00";
            
            $stmt = $db->prepare("SELECT id FROM attendance WHERE user_id = ? AND DATE(check_in) = ?");
            $stmt->execute([$userId, $date]);
            
            if (!$stmt->fetch()) {
                $stmt = $db->prepare("
                    INSERT INTO attendance (user_id, check_in, check_out) 
                    VALUES (?, ?, ?)
                ");
                $stmt->execute([$userId, $checkIn, $checkOut]);
                
                // Get user name
                $userStmt = $db->prepare("SELECT name FROM users WHERE id = ?");
                $userStmt->execute([$userId]);
                $userName = $userStmt->fetch()['name'];
                
                echo "Added attendance for {$userName} on {$date}<br>";
            }
        }
    }
    
    // 6. Add test stock movements
    echo "<h3>6. Adding Test Stock Movements...</h3>";
    
    $productStmt = $db->prepare("SELECT id, name, price_per_unit FROM products LIMIT 5");
    $productStmt->execute();
    $products = $productStmt->fetchAll();
    
    $movementTypes = ['in', 'out', 'adjustment'];
    $notes = [
        'in' => ['Purchase order delivery', 'Supplier stock', 'Return from client'],
        'out' => ['Project consumption', 'Sale to customer', 'Material issue'],
        'adjustment' => ['Stock count correction', 'Damage adjustment', 'Quality check adjustment']
    ];
    
    foreach ($products as $product) {
        for ($i = 0; $i < 3; $i++) {
            $type = $movementTypes[array_rand($movementTypes)];
            $quantity = rand(10, 100);
            $note = $notes[$type][array_rand($notes[$type])];
            
            recordStockMovement($product['id'], $type, $quantity, $product['price_per_unit'], $note);
            echo "Added stock movement: {$product['name']} - {$type} ({$quantity} units)<br>";
        }
    }
    
    // 7. Add test BOQ uploads
    echo "<h3>7. Adding Test BOQ Records...</h3>";
    
    $testBOQs = [
        ['project_boq_2025_001.pdf', 'Project Alpha BOQ', 'completed'],
        ['renovation_boq_jan2025.pdf', 'Office Renovation BOQ', 'uploaded'],
        ['furniture_boq_batch1.pdf', 'Furniture Manufacturing BOQ', 'processing']
    ];
    
    foreach ($testBOQs as $boqData) {
        $stmt = $db->prepare("
            INSERT INTO boq_uploads (filename, file_path, file_size, user_id, status, upload_date) 
            VALUES (?, ?, ?, 2, ?, NOW())
        ");
        $stmt->execute([
            $boqData[0],
            'uploads/boq/' . $boqData[0],
            rand(50000, 500000), // Random file size
            $boqData[2]
        ]);
        echo "Added BOQ upload: {$boqData[0]} ({$boqData[2]})<br>";
    }
    
    echo "<h3>✅ Test Data Generation Complete!</h3>";
    echo "<p><strong>Summary:</strong></p>";
    echo "<ul>";
    echo "<li>✅ 5 Test users with different roles</li>";
    echo "<li>✅ 10 Test products with stock levels</li>";
    echo "<li>✅ 5 Material requests with various status</li>";
    echo "<li>✅ 8 Petty cash transactions (income + expenses)</li>";
    echo "<li>✅ 45 Attendance records for last 9 days</li>";
    echo "<li>✅ 15 Stock movement entries</li>";
    echo "<li>✅ 3 BOQ upload records</li>";
    echo "</ul>";
    
    echo "<p><strong>Login Credentials:</strong></p>";
    echo "<ul>";
    echo "<li>Admin: admin / password123</li>";
    echo "<li>Manager: manager1 / password123</li>";
    echo "<li>Storekeeper: store1 / password123</li>";
    echo "<li>User: user1 / password123</li>";
    echo "</ul>";
    
    echo "<p><a href='index.php' class='btn btn-primary'>Go to Dashboard</a></p>";
    
} catch (Exception $e) {
    echo "<div class='alert alert-danger'>Error generating test data: " . $e->getMessage() . "</div>";
    error_log("Test data generation error: " . $e->getMessage());
}
?>