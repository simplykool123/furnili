<?php
/**
 * Check for duplicate function declarations across PHP files
 */

echo "<!DOCTYPE html>
<html>
<head>
    <title>Duplicate Function Checker - Furnili MS</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .success { color: green; }
        .error { color: red; }
        .warning { color: orange; }
        .function { background: #f5f5f5; padding: 5px; margin: 2px 0; border-radius: 3px; }
    </style>
</head>
<body>
    <h1>Duplicate Function Declaration Checker</h1>";

$files_to_check = [
    'includes/functions.php',
    'includes/auth.php',
    'config/database.php'
];

$all_functions = [];
$duplicates = [];

foreach ($files_to_check as $file) {
    if (!file_exists($file)) {
        echo "<p class='error'>File not found: $file</p>";
        continue;
    }
    
    $code = file_get_contents($file);
    
    // Find function declarations using regex
    preg_match_all('/function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/m', $code, $matches);
    
    if (!empty($matches[1])) {
        echo "<h3>Functions in $file:</h3>";
        foreach ($matches[1] as $function_name) {
            echo "<div class='function'>$function_name()</div>";
            
            if (isset($all_functions[$function_name])) {
                $duplicates[] = [
                    'function' => $function_name,
                    'files' => [$all_functions[$function_name], $file]
                ];
            } else {
                $all_functions[$function_name] = $file;
            }
        }
    }
}

echo "<h2>Duplicate Function Analysis</h2>";

if (empty($duplicates)) {
    echo "<p class='success'>✓ No duplicate function declarations found!</p>";
} else {
    echo "<p class='error'>✗ Found duplicate function declarations:</p>";
    
    foreach ($duplicates as $duplicate) {
        echo "<div class='error'>";
        echo "<strong>Function: {$duplicate['function']}()</strong><br>";
        echo "Declared in: " . implode(', ', $duplicate['files']) . "<br>";
        echo "</div><br>";
    }
    
    echo "<h3>Fix Instructions:</h3>";
    echo "<ul>";
    echo "<li>Remove duplicate function declarations</li>";
    echo "<li>Keep only one declaration per function</li>";
    echo "<li>Use comments to indicate where functions are defined</li>";
    echo "</ul>";
}

echo "<p><a href='syntax_check.php'>Check Syntax</a> | <a href='debug.php'>Run Debug</a></p>";

echo "</body></html>";
?>