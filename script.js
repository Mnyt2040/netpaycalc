document.addEventListener('DOMContentLoaded', function() {
    // ==============================================
    // INITIALIZATION & THEME SETUP
    // ==============================================
    const themeBtn = document.getElementById('themeBtn');
    themeBtn.addEventListener('click', toggleTheme);
    
    // Set initial theme
    if (localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        setTheme('dark');
    } else {
        setTheme('light');
    }
    
    // ==============================================
    // ELEMENT REFERENCES & EVENT LISTENERS
    // ==============================================
    const calculateBtn = document.getElementById('calculateBtn');
    const resetBtn = document.getElementById('resetBtn');
    const exportBtn = document.getElementById('exportBtn');
    
    calculateBtn.addEventListener('click', validateAndCalculate);
    resetBtn.addEventListener('click', resetForm);
    exportBtn.addEventListener('click', exportToPDF);
    
    // Initialize results as hidden
    document.getElementById('results').style.display = 'none';

    // ==============================================
    // CORE LOGIC FUNCTIONS (MILESTONES IMPLEMENTATION)
    // ==============================================

    /**
     * MILESTONE 1: Capture and validate input values
     */
    function validateAndCalculate() {
        clearErrors();
        
        // Validate employee details
        const name = document.getElementById('employeeName').value.trim();
        const id = document.getElementById('employeeId').value.trim();
        const dept = document.getElementById('employeeDepartment').value.trim();
        const grossSalary = parseFloat(document.getElementById('grossSalary').value);
        
        let isValid = true;
        
        if (!name) {
            showError('nameError', 'Employee name is required');
            isValid = false;
        }
        
        if (!id) {
            showError('idError', 'Employee ID is required');
            isValid = false;
        }
        
        if (!dept) {
            showError('deptError', 'Department is required');
            isValid = false;
        }
        
        if (isNaN(grossSalary)) {
            showError('salaryError', 'Please enter a valid salary');
            isValid = false;
        } else if (grossSalary < 0) {
            showError('salaryError', 'Salary cannot be negative');
            isValid = false;
        }
        
        if (!isValid) return;
        
        calculateSalary();
    }

    /**
     * MILESTONE 2: Apply PAYE tax bands and compute PAYE
     * Using Uganda's progressive tax bands (2023 rates)
     */
    function calculatePAYE(taxableIncome) {
        const taxBands = [
            { limit: 235000, rate: 0 },         // 0% up to 235,000 UGX
            { limit: 335000, rate: 0.1 },       // 10% on next 100,000
            { limit: 410000, rate: 0.2 },       // 20% on next 75,000
            { limit: 10000000, rate: 0.3 },     // 30% on next 9,590,000
            { limit: Infinity, rate: 0.4 }      // 40% on remainder
        ];
        
        let tax = 0;
        let previousLimit = 0;
        
        for (const band of taxBands) {
            if (taxableIncome > previousLimit) {
                const taxableAmount = Math.min(taxableIncome, band.limit) - previousLimit;
                tax += taxableAmount * band.rate;
                previousLimit = band.limit;
            } else {
                break;
            }
        }
        
        return tax;
    }

    /**
     * MILESTONE 3: Calculate NSSF contributions
     * Implements both Tier I and Tier II calculations
     */
    function calculateNSSF(taxableIncome, tier) {
        const tier1Limit = 180000; // UGX
        
        if (tier === 'tier1') {
            // Tier I: 5% employee, 10% employer (on first 180,000 UGX)
            const tier1Amount = Math.min(taxableIncome, tier1Limit);
            return {
                employeeNSSF: tier1Amount * 0.05,
                employerNSSF: tier1Amount * 0.1
            };
        } else {
            // Tier II: 10% employee, 10% employer (on amount above 180,000 UGX)
            if (taxableIncome > tier1Limit) {
                const tier2Amount = taxableIncome - tier1Limit;
                return {
                    employeeNSSF: (tier1Limit * 0.05) + (tier2Amount * 0.1),
                    employerNSSF: taxableIncome * 0.1
                };
            } else {
                return {
                    employeeNSSF: taxableIncome * 0.05,
                    employerNSSF: taxableIncome * 0.1
                };
            }
        }
    }

    /**
     * MILESTONE 4 & 5: Sum allowances, deductions and calculate net pay
     * Net Pay = Gross Salary - (PAYE + Employee NSSF + Other Deductions)
     */
    function calculateSalary() {
        // Get input values
        const salaryPeriod = document.getElementById('salaryPeriod').value;
        let grossSalary = parseFloat(document.getElementById('grossSalary').value);
        const nssfTier = document.querySelector('input[name="nssfTier"]:checked').value;
        
        // Convert annual to monthly if needed
        if (salaryPeriod === 'annual') {
            grossSalary = grossSalary / 12;
        }
        
        // Sum all allowances
        const housing = getValidatedNumber('housing', 0);
        const transport = getValidatedNumber('transport', 0);
        const medical = getValidatedNumber('medical', 0);
        const otherAllowance = getValidatedNumber('other', 0);
        const totalAllowances = housing + transport + medical + otherAllowance;
        
        // Apply other deductions
        const loan = getValidatedNumber('loan', 0);
        const savings = getValidatedNumber('savings', 0);
        const totalOtherDeductions = loan + savings;
        
        // Calculate taxable income
        const taxableIncome = grossSalary + totalAllowances;
        
        // Calculate taxes and contributions
        const paye = calculatePAYE(taxableIncome);
        const { employeeNSSF, employerNSSF } = calculateNSSF(taxableIncome, nssfTier);
        
        // Calculate net pay
        const totalDeductions = paye + employeeNSSF + totalOtherDeductions;
        const netPay = grossSalary + totalAllowances - totalDeductions;
        
        // Display results
        displayResults({
            grossSalary,
            totalAllowances,
            taxableIncome,
            paye,
            employeeNSSF,
            employerNSSF,
            totalOtherDeductions,
            totalDeductions,
            netPay
        });
    }

    // ==============================================
    // UI HELPER FUNCTIONS
    // ==============================================

    /**
     * MILESTONE 6: Display results dynamically
     */
    function displayResults(results) {
        // Set employee name
        document.getElementById('resultName').textContent = 
            document.getElementById('employeeName').value.trim();
        
        // Format and display all amounts
        document.getElementById('grossResult').textContent = formatCurrency(results.grossSalary);
        document.getElementById('allowancesResult').textContent = formatCurrency(results.totalAllowances);
        document.getElementById('taxableIncomeResult').textContent = formatCurrency(results.taxableIncome);
        document.getElementById('payeResult').textContent = formatCurrency(results.paye);
        document.getElementById('nssfEmployeeResult').textContent = formatCurrency(results.employeeNSSF);
        document.getElementById('deductionsResult').textContent = formatCurrency(results.totalOtherDeductions);
        document.getElementById('totalDeductions').textContent = formatCurrency(results.totalDeductions);
        document.getElementById('netPayResult').textContent = formatCurrency(results.netPay);
        
        // Show results section
        document.getElementById('results').style.display = 'block';
        
        // Scroll to results
        document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * MILESTONE 7: Reset functionality
     */
    function resetForm() {
        // Reset form inputs
        document.getElementById('salaryForm').reset();
        
        // Hide results section
        document.getElementById('results').style.display = 'none';
        
        // Clear any error messages
        clearErrors();
    }

    function clearErrors() {
        document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
    }

    function showError(elementId, message) {
        document.getElementById(elementId).textContent = message;
    }

    function getValidatedNumber(elementId, defaultValue) {
        const value = parseFloat(document.getElementById(elementId).value);
        return isNaN(value) ? defaultValue : Math.max(0, value);
    }

    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'UGX',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    // ==============================================
    // THEME MANAGEMENT
    // ==============================================
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        if (currentTheme === 'dark') {
            setTheme('light');
        } else {
            setTheme('dark');
        }
    }

    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        document.getElementById('themeBtn').textContent = theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
    }

    // ==============================================
    // EXPORT FUNCTIONALITY
    // ==============================================
    function exportToPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Get employee details
        const name = document.getElementById('employeeName').value.trim();
        const id = document.getElementById('employeeId').value.trim();
        const dept = document.getElementById('employeeDepartment').value.trim();
        
        // Add header
        doc.setFontSize(18);
        doc.text('EMPLOYEE SALARY SLIP', 105, 15, { align: 'center' });
        
        // Add company info
        doc.setFontSize(10);
        doc.text('Company Name: XYZ Corporation', 14, 25);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 160, 25);
        
        // Add employee info
        doc.setFontSize(12);
        doc.text(`Employee Name: ${name}`, 14, 35);
        doc.text(`Employee ID: ${id}`, 14, 45);
        doc.text(`Department: ${dept}`, 14, 55);
        
        // Add salary details
        doc.setFontSize(14);
        doc.text('Salary Details', 14, 70);
        
        // Add table headers
        doc.setFontSize(12);
        doc.text('Description', 14, 80);
        doc.text('Amount (UGX)', 160, 80);
        
        // Add salary items
        let yPosition = 90;
        const addSalaryLine = (label, value) => {
            doc.text(label, 14, yPosition);
            doc.text(value, 160, yPosition, { align: 'right' });
            yPosition += 10;
        };
        
        // Get values from displayed results
        const getResultValue = (id) => document.getElementById(id).textContent;
        
        addSalaryLine('Basic Salary', getResultValue('grossResult'));
        addSalaryLine('Total Allowances', getResultValue('allowancesResult'));
        addSalaryLine('Taxable Income', getResultValue('taxableIncomeResult'));
        doc.line(14, yPosition, 196, yPosition);
        yPosition += 5;
        addSalaryLine('PAYE Tax', getResultValue('payeResult'));
        addSalaryLine('Employee NSSF', getResultValue('nssfEmployeeResult'));
        addSalaryLine('Other Deductions', getResultValue('deductionsResult'));
        doc.line(14, yPosition, 196, yPosition);
        yPosition += 5;
        addSalaryLine('Total Deductions', getResultValue('totalDeductions'));
        doc.line(14, yPosition, 196, yPosition);
        yPosition += 10;
        
        // Add net pay
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        addSalaryLine('NET PAY', getResultValue('netPayResult'));
        
        // Add footer
        yPosition += 20;
        doc.setFontSize(10);
        doc.text('Authorized Signature: ___________________', 14, yPosition);
        doc.text('Date: ___________________', 160, yPosition);
        
        // Save the PDF
        doc.save(`${name}-salary-slip.pdf`);
    }
});