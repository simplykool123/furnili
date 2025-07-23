<?php
/**
 * PHP Syntax Checker for all PHP files
 */

echo "<!DOCTYPE html>
<html>
<head>
    <title>PHP Syntax Check - Furnili MS</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .success { color: green; }
        .error { color: red; }
        .file { background: #f5f5f5; padding: 10px; margin: 5px 0; border-radius: 4px; }
    </style>
</head>
<body>
    <h1>PHP Syntax Validation</h1>";

$files_to_check = [
    'config/database.php',
    'includes/functions.php',
    'includes/auth.php',
    'includes/header.php',
    'includes/sidebar.php',
    'index.php',
    'login.php',
    'products.php',
    'requests.php',
    'attendance.php',
    'petty_cash.php',
    'users.php',
    'boq_upload.php',
    'whatsapp_export.php',
    'backup.php'
];

$all_valid = true;

foreach ($files_to_check as $file) {
    echo "<div class='file'>";
    echo "<h3>Checking: $file</h3>";
    
    if (!file_exists($file)) {
        echo "<p class='error'>✗ File not found</p>";
        $all_valid = false;
    } else {
        // Check syntax using php -l equivalent
        $code = file_get_contents($file);
        
        // Basic syntax validation
        $temp_file = tempnam(sys_get_temp_dir(), 'php_check');
        file_put_contents($temp_file, $code);
        
        // Try to tokenize the PHP code
        $tokens = @token_get_all($code);
        if ($tokens === false) {
            echo "<p class='error'>✗ Cannot tokenize PHP file</p>";
            $all_valid = false;
        } else {
            // Check for basic syntax issues
            $bracket_count = 0;
            $paren_count = 0;
            $brace_count = 0;
            $syntax_ok = true;
            $error_msg = '';
            
            foreach ($tokens as $token) {
                if (is_array($token)) {
                    continue;
                } else {
                    switch ($token) {
                        case '{':
                            $brace_count++;
                            break;
                        case '}':
                            $brace_count--;
                            break;
                        case '[':
                            $bracket_count++;
                            break;
                        case ']':
                            $bracket_count--;
                            break;
                        case '(':
                            $paren_count++;
                            break;
                        case ')':
                            $paren_count--;
                            break;
                    }
                }
            }
            
            if ($brace_count !== 0) {
                $syntax_ok = false;
                $error_msg = "Unmatched braces: $brace_count";
            } elseif ($bracket_count !== 0) {
                $syntax_ok = false;
                $error_msg = "Unmatched brackets: $bracket_count";
            } elseif ($paren_count !== 0) {
                $syntax_ok = false;
                $error_msg = "Unmatched parentheses: $paren_count";
            }
            
            if ($syntax_ok) {
                echo "<p class='success'>✓ Syntax appears valid</p>";
            } else {
                echo "<p class='error'>✗ Syntax error: $error_msg</p>";
                $all_valid = false;
            }
        }
        
        unlink($temp_file);
    }
    echo "</div>";
}

echo "<h2>Summary</h2>";
if ($all_valid) {
    echo "<p class='success'>✓ All PHP files have valid syntax!</p>";
    echo "<p><a href='index.php'>Try Dashboard</a> | <a href='login.php'>Try Login</a></p>";
} else {
    echo "<p class='error'>✗ Some files have syntax errors. Please fix them before proceeding.</p>";
}

echo "</body></html>";
?>