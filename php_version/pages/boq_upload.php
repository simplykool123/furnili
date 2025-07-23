<?php
/**
 * BOQ Upload and OCR Processing Page
 */

require_once '../config/database.php';
require_once '../includes/functions.php';
require_once '../includes/auth.php';

requireAuth();
requireRole(['admin', 'manager']);

$user = getCurrentUser();
$db = Database::connect();

// Handle form submissions
$message = '';
$messageType = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['action'])) {
        switch ($_POST['action']) {
            case 'upload_boq':
                $result = uploadBOQFile($_FILES['boq_file'], $user['id']);
                $message = $result['message'];
                $messageType = $result['success'] ? 'success' : 'danger';
                break;
                
            case 'process_ocr':
                $result = processOCRFromImage($_FILES['ocr_image'], $_POST);
                $message = $result['message'];
                $messageType = $result['success'] ? 'success' : 'danger';
                break;
        }
    }
}

// Get uploaded BOQ files
$boqQuery = "
    SELECT b.*, u.name as uploaded_by_name 
    FROM boq_uploads b 
    LEFT JOIN users u ON b.user_id = u.id 
    ORDER BY b.upload_date DESC 
    LIMIT 20
";
$boqStmt = $db->prepare($boqQuery);
$boqStmt->execute();
$boqFiles = $boqStmt->fetchAll();
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BOQ & OCR Processing - <?php echo APP_NAME; ?></title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link href="../assets/css/style.css" rel="stylesheet">
</head>
<body>
    <?php include '../includes/header.php'; ?>
    
    <div class="container-fluid">
        <div class="row">
            <?php include '../includes/sidebar.php'; ?>
            
            <main class="col-md-9 ms-sm-auto col-lg-10 px-md-4">
                <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                    <h1 class="h2">BOQ Upload & OCR Processing</h1>
                </div>

                <?php if ($message): ?>
                    <div class="alert alert-<?php echo $messageType; ?> alert-dismissible fade show" role="alert">
                        <?php echo htmlspecialchars($message); ?>
                        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                    </div>
                <?php endif; ?>

                <!-- Upload Tabs -->
                <div class="card mb-4">
                    <div class="card-header">
                        <ul class="nav nav-tabs card-header-tabs" id="ocrTabs" role="tablist">
                            <li class="nav-item" role="presentation">
                                <button class="nav-link active" id="boq-tab" data-bs-toggle="tab" data-bs-target="#boq-upload" type="button" role="tab">
                                    <i class="fas fa-file-pdf"></i> BOQ Upload
                                </button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="ocr-tab" data-bs-toggle="tab" data-bs-target="#ocr-process" type="button" role="tab">
                                    <i class="fas fa-camera"></i> OCR Processing
                                </button>
                            </li>
                        </ul>
                    </div>
                    <div class="card-body">
                        <div class="tab-content" id="ocrTabContent">
                            <!-- BOQ Upload Tab -->
                            <div class="tab-pane fade show active" id="boq-upload" role="tabpanel">
                                <form method="POST" enctype="multipart/form-data">
                                    <input type="hidden" name="action" value="upload_boq">
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Select BOQ File (PDF)</label>
                                        <input type="file" name="boq_file" class="form-control" accept=".pdf" required>
                                        <div class="form-text">Upload PDF files containing Bill of Quantities for processing</div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Description (Optional)</label>
                                        <textarea name="description" class="form-control" rows="3" placeholder="Project details, client name, etc."></textarea>
                                    </div>
                                    
                                    <button type="submit" class="btn btn-primary">
                                        <i class="fas fa-upload"></i> Upload BOQ
                                    </button>
                                </form>
                            </div>

                            <!-- OCR Processing Tab -->
                            <div class="tab-pane fade" id="ocr-process" role="tabpanel">
                                <form method="POST" enctype="multipart/form-data" id="ocrForm">
                                    <input type="hidden" name="action" value="process_ocr">
                                    
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label class="form-label">Upload Image for OCR</label>
                                                <input type="file" name="ocr_image" class="form-control" accept="image/*" required id="imageInput">
                                                <div class="form-text">Upload receipt, invoice, or document image</div>
                                            </div>
                                            
                                            <div class="mb-3">
                                                <label class="form-label">Document Type</label>
                                                <select name="document_type" class="form-select" id="documentType">
                                                    <option value="receipt">Receipt/Invoice</option>
                                                    <option value="upi">UPI Payment Screenshot</option>
                                                    <option value="boq">BOQ Document</option>
                                                    <option value="general">General Text</option>
                                                </select>
                                            </div>
                                            
                                            <div class="mb-3">
                                                <label class="form-label">Extract Fields</label>
                                                <div class="form-check">
                                                    <input class="form-check-input" type="checkbox" name="extract_amount" id="extractAmount" checked>
                                                    <label class="form-check-label" for="extractAmount">Amount</label>
                                                </div>
                                                <div class="form-check">
                                                    <input class="form-check-input" type="checkbox" name="extract_date" id="extractDate" checked>
                                                    <label class="form-check-label" for="extractDate">Date</label>
                                                </div>
                                                <div class="form-check">
                                                    <input class="form-check-input" type="checkbox" name="extract_vendor" id="extractVendor" checked>
                                                    <label class="form-check-label" for="extractVendor">Vendor/Paid To</label>
                                                </div>
                                            </div>
                                            
                                            <button type="submit" class="btn btn-success" id="processBtn">
                                                <i class="fas fa-magic"></i> Process OCR
                                            </button>
                                        </div>
                                        
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label class="form-label">Image Preview</label>
                                                <div id="imagePreview" class="border rounded p-3 text-center text-muted">
                                                    <i class="fas fa-image fa-3x mb-2"></i>
                                                    <p>No image selected</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                                
                                <!-- OCR Results -->
                                <div id="ocrResults" style="display: none;">
                                    <hr>
                                    <h5>OCR Results</h5>
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="card">
                                                <div class="card-header">
                                                    <h6 class="mb-0">Extracted Text</h6>
                                                </div>
                                                <div class="card-body">
                                                    <div id="extractedText" class="small"></div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="card">
                                                <div class="card-header">
                                                    <h6 class="mb-0">Parsed Data</h6>
                                                </div>
                                                <div class="card-body">
                                                    <div id="parsedData"></div>
                                                    <button type="button" class="btn btn-primary btn-sm mt-2" onclick="saveParsedData()">
                                                        <i class="fas fa-save"></i> Save to Petty Cash
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Recent BOQ Files -->
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0">Recent BOQ Uploads</h5>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-striped">
                                <thead>
                                    <tr>
                                        <th>File Name</th>
                                        <th>Uploaded By</th>
                                        <th>Upload Date</th>
                                        <th>Status</th>
                                        <th>Size</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($boqFiles as $file): ?>
                                        <tr>
                                            <td>
                                                <i class="fas fa-file-pdf text-danger me-2"></i>
                                                <?php echo htmlspecialchars($file['filename']); ?>
                                            </td>
                                            <td><?php echo htmlspecialchars($file['uploaded_by_name'] ?? 'System'); ?></td>
                                            <td><?php echo date('M j, Y g:i A', strtotime($file['upload_date'])); ?></td>
                                            <td>
                                                <span class="badge bg-<?php 
                                                    echo match($file['status']) {
                                                        'uploaded' => 'secondary',
                                                        'processing' => 'warning',
                                                        'completed' => 'success',
                                                        'failed' => 'danger',
                                                        default => 'secondary'
                                                    };
                                                ?>">
                                                    <?php echo ucfirst($file['status']); ?>
                                                </span>
                                            </td>
                                            <td>
                                                <?php if ($file['file_size']): ?>
                                                    <?php echo formatFileSize($file['file_size']); ?>
                                                <?php else: ?>
                                                    <span class="text-muted">-</span>
                                                <?php endif; ?>
                                            </td>
                                            <td>
                                                <div class="btn-group" role="group">
                                                    <a href="<?php echo htmlspecialchars($file['file_path']); ?>" 
                                                       target="_blank" class="btn btn-sm btn-outline-primary">
                                                        <i class="fas fa-eye"></i> View
                                                    </a>
                                                    <?php if ($file['extracted_text']): ?>
                                                        <button type="button" class="btn btn-sm btn-outline-success" 
                                                                onclick="viewExtractedText(<?php echo $file['id']; ?>)">
                                                            <i class="fas fa-file-alt"></i> Text
                                                        </button>
                                                    <?php endif; ?>
                                                    <button type="button" class="btn btn-sm btn-outline-danger" 
                                                            onclick="deleteBOQ(<?php echo $file['id']; ?>)">
                                                        <i class="fas fa-trash"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    </div>

    <!-- Include Tesseract.js for OCR -->
    <script src="https://cdn.jsdelivr.net/npm/tesseract.js@2.1.0/dist/tesseract.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    
    <script>
        // Image preview functionality
        document.getElementById('imageInput').addEventListener('change', function(e) {
            const file = e.target.files[0];
            const preview = document.getElementById('imagePreview');
            
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    preview.innerHTML = `<img src="${e.target.result}" class="img-fluid" style="max-height: 300px;">`;
                };
                reader.readAsDataURL(file);
            } else {
                preview.innerHTML = `
                    <i class="fas fa-image fa-3x mb-2"></i>
                    <p>No image selected</p>
                `;
            }
        });

        // OCR Processing
        document.getElementById('ocrForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const fileInput = document.getElementById('imageInput');
            const file = fileInput.files[0];
            
            if (!file) {
                alert('Please select an image file');
                return;
            }
            
            const processBtn = document.getElementById('processBtn');
            const originalText = processBtn.innerHTML;
            
            // Show loading
            processBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            processBtn.disabled = true;
            
            // Process with Tesseract.js
            Tesseract.recognize(file, 'eng', {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        const progress = Math.round(m.progress * 100);
                        processBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Processing... ${progress}%`;
                    }
                }
            }).then(({ data: { text } }) => {
                // Display results
                document.getElementById('extractedText').textContent = text;
                
                // Parse based on document type
                const documentType = document.getElementById('documentType').value;
                const parsedData = parseOCRText(text, documentType);
                displayParsedData(parsedData);
                
                // Show results
                document.getElementById('ocrResults').style.display = 'block';
                
                // Reset button
                processBtn.innerHTML = originalText;
                processBtn.disabled = false;
                
            }).catch(err => {
                console.error('OCR Error:', err);
                alert('OCR processing failed. Please try again.');
                
                processBtn.innerHTML = originalText;
                processBtn.disabled = false;
            });
        });

        // Parse OCR text based on document type
        function parseOCRText(text, documentType) {
            const data = {
                amount: null,
                date: null,
                vendor: null,
                reference: null
            };
            
            // Amount extraction patterns
            const amountPatterns = [
                /(?:₹|Rs\.?|INR)\s*(\d+(?:,\d+)*(?:\.\d{2})?)/gi,
                /(\d+(?:,\d+)*(?:\.\d{2})?)\s*(?:₹|Rs\.?|INR)/gi,
                /Total[:\s]+(?:₹|Rs\.?)?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/gi,
                /Amount[:\s]+(?:₹|Rs\.?)?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/gi
            ];
            
            for (const pattern of amountPatterns) {
                const match = pattern.exec(text);
                if (match) {
                    data.amount = match[1].replace(/,/g, '');
                    break;
                }
            }
            
            // Date extraction patterns
            const datePatterns = [
                /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/g,
                /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{2,4})/gi,
                /Date[:\s]+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/gi
            ];
            
            for (const pattern of datePatterns) {
                const match = pattern.exec(text);
                if (match) {
                    data.date = match[1];
                    break;
                }
            }
            
            // Vendor/Paid To extraction (context-dependent)
            if (documentType === 'upi') {
                const upiPatterns = [
                    /To[:\s]+([A-Za-z\s]+)/gi,
                    /Paid to[:\s]+([A-Za-z\s]+)/gi,
                    /Beneficiary[:\s]+([A-Za-z\s]+)/gi
                ];
                
                for (const pattern of upiPatterns) {
                    const match = pattern.exec(text);
                    if (match) {
                        data.vendor = match[1].trim();
                        break;
                    }
                }
            }
            
            // Reference extraction
            const refPatterns = [
                /(?:Ref|Reference|Transaction)[:\s#]+([A-Za-z0-9]+)/gi,
                /UTR[:\s]+([A-Za-z0-9]+)/gi
            ];
            
            for (const pattern of refPatterns) {
                const match = pattern.exec(text);
                if (match) {
                    data.reference = match[1];
                    break;
                }
            }
            
            return data;
        }

        // Display parsed data
        function displayParsedData(data) {
            let html = '';
            
            if (data.amount) {
                html += `<p><strong>Amount:</strong> ₹${data.amount}</p>`;
            }
            if (data.date) {
                html += `<p><strong>Date:</strong> ${data.date}</p>`;
            }
            if (data.vendor) {
                html += `<p><strong>Paid To:</strong> ${data.vendor}</p>`;
            }
            if (data.reference) {
                html += `<p><strong>Reference:</strong> ${data.reference}</p>`;
            }
            
            if (!html) {
                html = '<p class="text-muted">No structured data could be extracted</p>';
            }
            
            document.getElementById('parsedData').innerHTML = html;
            
            // Store data for saving
            window.parsedOCRData = data;
        }

        // Save parsed data to petty cash
        function saveParsedData() {
            if (!window.parsedOCRData) {
                alert('No data to save');
                return;
            }
            
            const data = window.parsedOCRData;
            
            // Create form to submit to petty cash
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = 'petty_cash.php';
            
            form.innerHTML = `
                <input type="hidden" name="action" value="add_expense">
                <input type="hidden" name="amount" value="${data.amount || ''}">
                <input type="hidden" name="date" value="${formatDateForInput(data.date) || new Date().toISOString().split('T')[0]}">
                <input type="hidden" name="paid_to" value="${data.vendor || ''}">
                <input type="hidden" name="description" value="Added via OCR processing">
                <input type="hidden" name="category" value="OCR Processed">
            `;
            
            document.body.appendChild(form);
            
            if (confirm('Save this data to Petty Cash expenses?')) {
                form.submit();
            }
            
            document.body.removeChild(form);
        }

        // Format date for input field
        function formatDateForInput(dateStr) {
            if (!dateStr) return null;
            
            try {
                const date = new Date(dateStr);
                return date.toISOString().split('T')[0];
            } catch (e) {
                return null;
            }
        }

        // View extracted text
        function viewExtractedText(boqId) {
            // Implement view extracted text functionality
            window.open(`view_extracted_text.php?id=${boqId}`, '_blank');
        }

        // Delete BOQ
        function deleteBOQ(boqId) {
            if (confirm('Are you sure you want to delete this BOQ file?')) {
                // Implement delete functionality
                window.location.href = `delete_boq.php?id=${boqId}`;
            }
        }
    </script>
</body>
</html>

<?php
/**
 * Helper functions for BOQ and OCR processing
 */

function uploadBOQFile($file, $userId) {
    try {
        if ($file['error'] !== UPLOAD_ERR_OK) {
            return ['success' => false, 'message' => 'File upload failed'];
        }
        
        // Validate file type
        $allowedTypes = ['application/pdf'];
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        
        if (!in_array($mimeType, $allowedTypes)) {
            return ['success' => false, 'message' => 'Only PDF files are allowed'];
        }
        
        // Create upload directory
        $uploadDir = UPLOAD_PATH . 'boq/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        
        // Generate unique filename
        $fileName = time() . '_' . basename($file['name']);
        $filePath = $uploadDir . $fileName;
        
        if (move_uploaded_file($file['tmp_name'], $filePath)) {
            // Save to database
            $db = Database::connect();
            $stmt = $db->prepare("
                INSERT INTO boq_uploads (filename, file_path, file_size, user_id, status) 
                VALUES (?, ?, ?, ?, 'uploaded')
            ");
            
            $stmt->execute([
                $file['name'],
                'uploads/boq/' . $fileName,
                $file['size'],
                $userId
            ]);
            
            return ['success' => true, 'message' => 'BOQ file uploaded successfully'];
        } else {
            return ['success' => false, 'message' => 'Failed to move uploaded file'];
        }
        
    } catch (Exception $e) {
        error_log("BOQ upload error: " . $e->getMessage());
        return ['success' => false, 'message' => 'Upload failed: ' . $e->getMessage()];
    }
}

function processOCRFromImage($file, $data) {
    try {
        if ($file['error'] !== UPLOAD_ERR_OK) {
            return ['success' => false, 'message' => 'Image upload failed'];
        }
        
        // Validate image type
        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        
        if (!in_array($mimeType, $allowedTypes)) {
            return ['success' => false, 'message' => 'Only image files are allowed'];
        }
        
        // Create upload directory
        $uploadDir = UPLOAD_PATH . 'ocr/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        
        // Generate unique filename
        $fileName = time() . '_' . basename($file['name']);
        $filePath = $uploadDir . $fileName;
        
        if (move_uploaded_file($file['tmp_name'], $filePath)) {
            return ['success' => true, 'message' => 'Image uploaded for OCR processing'];
        } else {
            return ['success' => false, 'message' => 'Failed to move uploaded file'];
        }
        
    } catch (Exception $e) {
        error_log("OCR processing error: " . $e->getMessage());
        return ['success' => false, 'message' => 'OCR processing failed: ' . $e->getMessage()];
    }
}

function formatFileSize($bytes) {
    if ($bytes >= 1073741824) {
        return number_format($bytes / 1073741824, 2) . ' GB';
    } elseif ($bytes >= 1048576) {
        return number_format($bytes / 1048576, 2) . ' MB';
    } elseif ($bytes >= 1024) {
        return number_format($bytes / 1024, 2) . ' KB';
    } else {
        return $bytes . ' bytes';
    }
}
?>