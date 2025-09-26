// dashboard-support.js
// ملف دعم للتقرير لتحسين الكفاءة ودعم تحميل البيانات

class DashboardDataProcessor {
    constructor() {
        this.businessData = null;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // مستمع لزر تحميل البيانات
        document.getElementById('upload-data-btn')?.addEventListener('click', () => {
            this.handleFileUpload();
        });

        // مستمع لتغيير ملف الإدخال
        document.getElementById('data-file')?.addEventListener('change', (e) => {
            this.handleFileSelection(e);
        });
    }

    handleFileSelection(event) {
        const file = event.target.files[0];
        if (file) {
            this.showUploadStatus(`تم اختيار الملف: ${file.name}`, 'info');
        }
    }

    handleFileUpload() {
        const fileInput = document.getElementById('data-file');
        const file = fileInput.files[0];
        
        if (!file) {
            this.showUploadStatus('الرجاء اختيار ملف أولاً', 'error');
            return;
        }

        const fileName = file.name;
        const fileExtension = fileName.split('.').pop().toLowerCase();

        this.showUploadStatus('جاري معالجة الملف...', 'info');

        if (fileExtension === 'json') {
            this.processJsonFile(file);
        } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
            this.processExcelFile(file);
        } else {
            this.showUploadStatus('تنسيق الملف غير مدعوم. الرجاء استخدام JSON أو Excel', 'error');
        }
    }

    processJsonFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.updateDashboardData(data);
                this.showUploadStatus('تم تحميل بيانات JSON بنجاح!', 'success');
            } catch (error) {
                this.showUploadStatus('خطأ في تحليل ملف JSON: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
    }

    processExcelFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const jsonData = this.convertExcelToJson(workbook);
                this.updateDashboardData(jsonData);
                this.showUploadStatus('تم تحميل بيانات Excel بنجاح!', 'success');
            } catch (error) {
                this.showUploadStatus('خطأ في معالجة ملف Excel: ' + error.message, 'error');
            }
        };
        reader.readAsArrayBuffer(file);
    }

    convertExcelToJson(workbook) {
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        
        // تحويل البيانات المسطحة إلى الهيكل المطلوب
        return this.transformFlatData(jsonData);
    }

    transformFlatData(flatData) {
        const header = flatData[0];
        const rows = flatData.slice(1);
        
        // إنشاء مصفوفة من الكائنات
        const dataObjects = rows.map(row => {
            const obj = {};
            header.forEach((col, index) => {
                obj[col] = row[index];
            });
            return obj;
        });

        // تحويل إلى هيكل businessData
        const transformedData = {
            branches: [...new Set(dataObjects.map(d => d.Branch))],
            branchNames: {},
            months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            monthNames: {
                'Jan': 'January', 'Feb': 'February', 'Mar': 'March', 'Apr': 'April',
                'May': 'May', 'Jun': 'June', 'Jul': 'July', 'Aug': 'August',
                'Sep': 'September', 'Oct': 'October', 'Nov': 'November', 'Dec': 'December'
            },
            deliveryPercentages: {
                2024: 0.814,
                2025: 0.681
            },
            data2024: { sales: {}, orders: {} },
            data2025: { sales: {}, orders: {} },
            userEntries: []
        };

        // إنشاء أسماء الفروع
        transformedData.branches.forEach(branch => {
            transformedData.branchNames[branch] = `Crispy Chicken - ${branch}`;
        });

        // تهيئة هياكل البيانات
        transformedData.branches.forEach(branch => {
            transformedData.data2024.sales[branch] = new Array(12).fill(0);
            transformedData.data2024.orders[branch] = new Array(12).fill(0);
            transformedData.data2025.sales[branch] = new Array(12).fill(0);
            transformedData.data2025.orders[branch] = new Array(12).fill(0);
        });

        // ملء البيانات
        dataObjects.forEach(record => {
            const branch = record.Branch;
            const month = record.Month;
            const year = parseInt(record.Year);
            const sales = parseFloat(record.Sales) || 0;
            const orders = parseInt(record.Orders) || 0;

            const monthIndex = transformedData.months.indexOf(month);
            if (monthIndex === -1) {
                console.warn(`شهر غير صالح: ${month}`);
                return;
            }

            if (year === 2024) {
                transformedData.data2024.sales[branch][monthIndex] = sales;
                transformedData.data2024.orders[branch][monthIndex] = orders;
            } else if (year === 2025) {
                transformedData.data2025.sales[branch][monthIndex] = sales;
                transformedData.data2025.orders[branch][monthIndex] = orders;
            }
        });

        return transformedData;
    }

    updateDashboardData(newData) {
        // تحديث بيانات businessData العامة
        if (window.businessData) {
            Object.assign(window.businessData, newData);
        } else {
            window.businessData = newData;
        }

        // تحديث التقرير
        this.refreshDashboard();
    }

    refreshDashboard() {
        // تحديث جميع الأقسام
        if (typeof refreshAllSections === 'function') {
            refreshAllSections();
        }
        
        // تحديث قسم النظرة العامة
        if (typeof updateOverviewSection === 'function') {
            updateOverviewSection();
        }

        // إظهار إشعار النجاح
        if (typeof showNotification === 'function') {
            showNotification('تم تحديث التقرير بالبيانات الجديدة!', 'success');
        }
    }

    showUploadStatus(message, type = 'info') {
        const statusDiv = document.getElementById('upload-status');
        if (!statusDiv) return;

        statusDiv.innerHTML = `
            <div class="alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'}">
                <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
                ${message}
            </div>
        `;

        // إخفاء الرسالة بعد 5 ثوانٍ
        setTimeout(() => {
            statusDiv.innerHTML = '';
        }, 5000);
    }

    // دالة لتصدير البيانات الحالية كـ JSON
    exportCurrentData() {
        if (!window.businessData) {
            this.showUploadStatus('لا توجد بيانات للتصدير', 'error');
            return;
        }

        const dataStr = JSON.stringify(window.businessData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `crispy-chicken-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        this.showUploadStatus('تم تصدير البيانات بنجاح!', 'success');
    }

    // دالة للتحقق من صحة البيانات
    validateData(data) {
        const issues = [];
        
        // التحقق من وجود الفروع
        if (!data.branches || data.branches.length === 0) {
            issues.push('لا توجد فروع في البيانات');
        }

        // التحقق من وجود بيانات المبيعات
        if (!data.data2024 || !data.data2025) {
            issues.push('بيانات المبيعات غير مكتملة');
        }

        // التحقق من اتساق البيانات
        data.branches.forEach(branch => {
            data.months.forEach((month, monthIndex) => {
                const sales2024 = data.data2024.sales[branch][monthIndex];
                const orders2024 = data.data2024.orders[branch][monthIndex];
                const sales2025 = data.data2025.sales[branch][monthIndex];
                const orders2025 = data.data2025.orders[branch][monthIndex];

                if (sales2024 > 0 && orders2024 === 0) {
                    issues.push(`${branch} ${month}: مبيعات بدون طلبات في 2024`);
                }
                if (orders2024 > 0 && sales2024 === 0) {
                    issues.push(`${branch} ${month}: طلبات بدون مبيعات في 2024`);
                }
                if (sales2025 > 0 && orders2025 === 0) {
                    issues.push(`${branch} ${month}: مبيعات بدون طلبات في 2025`);
                }
                if (orders2025 > 0 && sales2025 === 0) {
                    issues.push(`${branch} ${month}: طلبات بدون مبيعات في 2025`);
                }
            });
        });

        return issues;
    }

    // دالة لإنشاء نموذج Excel فارغ
    generateEmptyExcelTemplate() {
        const templateData = [
            ['Branch', 'Month', 'Year', 'Sales', 'Orders'],
            ['Hamdan', 'Jan', 2024, 0, 0],
            ['Hamdan', 'Feb', 2024, 0, 0],
            // ... أضف باقي الأشهر والفروع
        ];

        const ws = XLSX.utils.aoa_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data");

        XLSX.writeFile(wb, "crispy-chicken-template.xlsx");
        this.showUploadStatus('تم تنزيل نموذج Excel فارغ!', 'success');
    }
}

// تهيئة معالج البيانات عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    window.dashboardProcessor = new DashboardDataProcessor();
    
    // إضافة زر التصدير إذا لم يكن موجودًا
    if (!document.getElementById('export-data-btn')) {
        const exportBtn = document.createElement('button');
        exportBtn.id = 'export-data-btn';
        exportBtn.className = 'btn btn-secondary';
        exportBtn.innerHTML = '<i class="fas fa-download"></i> تصدير البيانات الحالية';
        exportBtn.style.marginTop = '10px';
        exportBtn.onclick = () => window.dashboardProcessor.exportCurrentData();
        
        const uploadSection = document.querySelector('#data-entry .data-entry-form:last-child');
        if (uploadSection) {
            uploadSection.appendChild(exportBtn);
        }
    }

    // إضافة زر لتحميل النموذج
    if (!document.getElementById('download-template-btn')) {
        const templateBtn = document.createElement('button');
        templateBtn.id = 'download-template-btn';
        templateBtn.className = 'btn btn-secondary';
        templateBtn.innerHTML = '<i class="fas fa-file-excel"></i> تحميل نموذج Excel';
        templateBtn.style.marginTop = '10px';
        templateBtn.onclick = () => window.dashboardProcessor.generateEmptyExcelTemplate();
        
        const uploadSection = document.querySelector('#data-entry .data-entry-form:last-child');
        if (uploadSection) {
            uploadSection.appendChild(templateBtn);
        }
    }
});
