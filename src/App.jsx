import React, { useState } from 'react';
import { Users, Clock, Calendar, TrendingUp, Search, Download, Target, Coffee, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export default function StaffDashboard() {
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('');
    const [selectedYear, setSelectedYear] = useState('2025'); 
    const [loading, setLoading] = useState(false);
    const [loadingMonthly, setLoadingMonthly] = useState(false);
    const [error, setError] = useState('');
    
    // Stats state
    const [stats, setStats] = useState({
        totalHoursFormatted: '0 hrs 0 min',
        totalPlannedHours: 0,
        overtimeHours: 0,
        workDays: 0,
        averageShiftDuration: 0,
        totalBreakHours: 0
    });
    
    const [timeEntries, setTimeEntries] = useState([]);

    // 🔒 Static employees list - sorted alphabetically
    const EMPLOYEES = [
        { id: 14, name: 'Annabelle Cazals', role: 'Waiter', department: 'General' },
        { id: 9, name: 'Bohdan Zavhorodnii', role: 'Chef', department: 'General' },
        { id: 8, name: 'Elzbieta Karpinska', role: 'Chef', department: 'General' },
        { id: 18, name: 'Gustav James Myklestad Barrett', role: 'Waiter', department: 'General' },
        { id: 12, name: 'Helene Göpfert', role: 'Waiter', department: 'General' },
        { id: 19, name: 'Joel Rimu Laurance', role: 'Helper', department: 'General' },
        { id: 15, name: 'Julia Gasser', role: 'Waiter', department: 'General' },
        { id: 10, name: 'Lotte Bruin', role: 'Waiter', department: 'General' },
        { id: 16, name: 'Marit Jonsdotter Gåsvatn', role: 'Waiter', department: 'General' },
        { id: 13, name: 'Michelle Pavan', role: 'Waiter', department: 'General' },
        { id: 17, name: 'Oliver heszlein-lossius.', role: 'Waiter', department: 'General' },
        { id: 11, name: 'Steffen Bjerk', role: 'Waiter', department: 'General' },
        { id: 21, name: 'Victoria Tamas', role: 'Waiter', department: 'General' },
        { id: 20, name: 'Yericka Italia Ruggeri', role: 'Waiter', department: 'General' },
    ];

    const N8N_WEBHOOKS = {
        calculateHours: 'https://primary-production-191cf.up.railway.app/webhook/Calculate_Hours'
    };

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const years = ['2024', '2025', '2026'];

    const formatTime = (isoString) => {
        if (!isoString) return '--:--';
        try {
            return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        } catch (e) {
            return isoString;
        }
    };

    const shortenDuration = (str) => {
        if (!str) return '0 hrs 0 min';
        return str.replace('hours', 'hrs').replace('minutes', 'min');
    };

    const calculateHours = async () => {
        if (!selectedEmployee || !selectedMonth || !selectedYear) {
            setError('Please select an employee, month, and year');
            return;
        }

        setLoading(true);
        setError('');
        
        // Reset UI
        setStats({
            totalHoursFormatted: '0 hrs 0 min',
            totalPlannedHours: 0,
            overtimeHours: 0,
            workDays: 0,
            averageShiftDuration: 0,
            totalBreakHours: 0
        });
        setTimeEntries([]);

        try {
            const startDate = new Date(selectedYear, selectedMonth - 1, 1).toISOString().split('T')[0];
            const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];
            const empObj = EMPLOYEES.find(e => String(e.id) === String(selectedEmployee));

            const response = await fetch(N8N_WEBHOOKS.calculateHours, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employeeId: selectedEmployee,
                    employeeName: empObj ? empObj.name : '',
                    startDate,
                    endDate
                })
            });

            if (!response.ok) throw new Error(`Server error: ${response.status}`);

            const rawData = await response.json();
            console.log("📦 Data from n8n:", rawData);

            // Handle both Object and Array formats
            let summary = rawData;
            if (Array.isArray(rawData)) {
                summary = rawData.length > 0 ? rawData[0] : null;
            }

            if (summary && summary.entries && summary.entries.length > 0) {
                setStats({
                    totalHoursFormatted: shortenDuration(summary.totalHoursFormatted),
                    totalPlannedHours: summary.totalPlannedHours || 0,
                    overtimeHours: summary.overtimeHours || 0,
                    workDays: summary.workDays || 0,
                    averageShiftDuration: summary.averageShiftDuration || 0,
                    totalBreakHours: summary.totalBreakHours || 0
                });

                const formattedEntries = summary.entries.map(item => ({
                    date: item.date,
                    clockIn: formatTime(item.clockIn),
                    clockOut: formatTime(item.clockOut),
                    shiftName: item.shiftName,
                    breakHours: item.breakHours,
                    plannedHours: item.plannedHours,
                    actualHours: item.actualHours,
                    difference: (item.actualHours - item.plannedHours).toFixed(2)
                }));

                formattedEntries.sort((a, b) => new Date(b.date) - new Date(a.date));
                setTimeEntries(formattedEntries);
            } else {
                setError('No time entries found for this period');
            }

        } catch (error) {
            console.error('Error calculating hours:', error);
            setError('Failed to fetch data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const downloadMonthlyReport = async () => {
        if (!selectedMonth || !selectedYear) {
            setError('Please select a month and year for the monthly report');
            return;
        }

        setLoadingMonthly(true);
        setError('');

        try {
            const startDate = new Date(selectedYear, selectedMonth - 1, 1).toISOString().split('T')[0];
            const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];
            const monthName = months[parseInt(selectedMonth) - 1];

            // Fetch data for all employees
            const allEmployeeData = await Promise.all(
                EMPLOYEES.map(async (emp) => {
                    try {
                        const response = await fetch(N8N_WEBHOOKS.calculateHours, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                employeeId: emp.id,
                                employeeName: emp.name,
                                startDate,
                                endDate
                            })
                        });

                        if (!response.ok) return null;

                        const rawData = await response.json();
                        let summary = Array.isArray(rawData) ? rawData[0] : rawData;

                        if (summary && summary.entries && summary.entries.length > 0) {
                            return {
                                ...emp,
                                stats: {
                                    totalHours: summary.totalHours || 0,
                                    totalHoursFormatted: shortenDuration(summary.totalHoursFormatted),
                                    totalPlannedHours: summary.totalPlannedHours || 0,
                                    overtimeHours: summary.overtimeHours || 0,
                                    workDays: summary.workDays || 0,
                                    averageShiftDuration: summary.averageShiftDuration || 0,
                                    totalBreakHours: summary.totalBreakHours || 0
                                }
                            };
                        }
                        return null;
                    } catch (err) {
                        console.error(`Error fetching data for ${emp.name}:`, err);
                        return null;
                    }
                })
            );

            // Filter out employees with no data
            const employeesWithData = allEmployeeData.filter(emp => emp !== null);

            if (employeesWithData.length === 0) {
                setError('No employee data found for this period');
                setLoadingMonthly(false);
                return;
            }

            // Calculate totals
            const totals = employeesWithData.reduce((acc, emp) => ({
                totalHours: acc.totalHours + emp.stats.totalHours,
                totalPlannedHours: acc.totalPlannedHours + emp.stats.totalPlannedHours,
                overtimeHours: acc.overtimeHours + emp.stats.overtimeHours,
                workDays: acc.workDays + emp.stats.workDays,
                totalBreakHours: acc.totalBreakHours + emp.stats.totalBreakHours
            }), { totalHours: 0, totalPlannedHours: 0, overtimeHours: 0, workDays: 0, totalBreakHours: 0 });

            const avgHoursPerEmployee = (totals.totalHours / employeesWithData.length).toFixed(1);

            // Generate PDF
            const printWindow = window.open('', '_blank');
            const currentDate = new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric'
            });

            const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Monthly Staff Report - ${monthName} ${selectedYear}</title>
    <style>
        @media print {
            @page { margin: 1.5cm; size: A4 landscape; }
            body { margin: 0; }
            .no-print { display: none; }
        }
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 30px;
            background: #f5f5f5;
        }
        
        .report-container {
            background: white;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            max-width: 100%;
        }
        
        .header {
            text-align: center;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .header h1 {
            font-size: 28px;
            color: #1e293b;
            margin-bottom: 5px;
        }
        
        .header .subtitle {
            color: #64748b;
            font-size: 16px;
        }
        
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 15px;
            margin-bottom: 30px;
        }
        
        .summary-card {
            background: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            border: 1px solid #e2e8f0;
        }
        
        .summary-card .label {
            font-size: 11px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }
        
        .summary-card .value {
            font-size: 24px;
            font-weight: bold;
            color: #1e293b;
        }
        
        .summary-card .unit {
            font-size: 12px;
            color: #64748b;
            margin-top: 2px;
        }
        
        .summary-card.highlight {
            background: #dbeafe;
            border-color: #2563eb;
        }
        
        .summary-card.highlight .value {
            color: #2563eb;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            font-size: 12px;
        }
        
        thead {
            background: #1e293b;
            color: white;
        }
        
        th {
            text-align: left;
            padding: 12px 10px;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.5px;
        }
        
        th.text-right { text-align: right; }
        
        td {
            padding: 12px 10px;
            border-bottom: 1px solid #e2e8f0;
            color: #334155;
        }
        
        td.text-right { text-align: right; }
        
        tbody tr:nth-child(even) {
            background: #f8fafc;
        }
        
        tbody tr:hover {
            background: #f1f5f9;
        }
        
        .role-badge {
            background: #e0e7ff;
            color: #4338ca;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
            display: inline-block;
        }
        
        .positive { color: #059669; font-weight: 600; }
        .negative { color: #dc2626; font-weight: 600; }
        .neutral { color: #64748b; }
        
        tfoot {
            background: #f1f5f9;
            font-weight: bold;
        }
        
        tfoot td {
            padding: 15px 10px;
            border-top: 2px solid #2563eb;
            border-bottom: 2px solid #2563eb;
        }
        
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            color: #64748b;
            font-size: 11px;
        }
        
        .no-print {
            text-align: center;
            margin-top: 20px;
            padding: 20px;
        }
        
        .btn {
            background: #2563eb;
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            margin: 0 10px;
        }
        
        .btn:hover {
            background: #1d4ed8;
        }
        
        .btn-secondary {
            background: #64748b;
        }
        
        .btn-secondary:hover {
            background: #475569;
        }
    </style>
</head>
<body>
    <div class="report-container">
        <div class="header">
            <h1>Monthly Staff Report</h1>
            <div class="subtitle">${monthName} ${selectedYear}</div>
        </div>
        
        <div class="summary-grid">
            <div class="summary-card highlight">
                <div class="label">Total Employees</div>
                <div class="value">${employeesWithData.length}</div>
            </div>
            <div class="summary-card">
                <div class="label">Total Hours</div>
                <div class="value">${totals.totalHours.toFixed(1)}</div>
                <div class="unit">hours</div>
            </div>
            <div class="summary-card">
                <div class="label">Planned Hours</div>
                <div class="value">${totals.totalPlannedHours.toFixed(1)}</div>
                <div class="unit">hours</div>
            </div>
            <div class="summary-card ${totals.overtimeHours >= 0 ? 'positive' : 'negative'}">
                <div class="label">Total Difference</div>
                <div class="value">${totals.overtimeHours > 0 ? '+' : ''}${totals.overtimeHours.toFixed(1)}</div>
                <div class="unit">hours</div>
            </div>
            <div class="summary-card">
                <div class="label">Avg per Employee</div>
                <div class="value">${avgHoursPerEmployee}</div>
                <div class="unit">hours</div>
            </div>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>Employee Name</th>
                    <th>Role</th>
                    <th class="text-right">Work Days</th>
                    <th class="text-right">Total Hours</th>
                    <th class="text-right">Planned</th>
                    <th class="text-right">Difference</th>
                    <th class="text-right">Avg Shift</th>
                    <th class="text-right">Break Time</th>
                </tr>
            </thead>
            <tbody>
                ${employeesWithData.map(emp => {
                    const diff = emp.stats.overtimeHours;
                    const diffClass = diff > 0 ? 'positive' : diff < 0 ? 'negative' : 'neutral';
                    return `
                    <tr>
                        <td><strong>${emp.name}</strong></td>
                        <td><span class="role-badge">${emp.role}</span></td>
                        <td class="text-right">${emp.stats.workDays}</td>
                        <td class="text-right"><strong>${emp.stats.totalHours.toFixed(1)}h</strong></td>
                        <td class="text-right">${emp.stats.totalPlannedHours}h</td>
                        <td class="text-right ${diffClass}">${diff > 0 ? '+' : ''}${diff.toFixed(1)}h</td>
                        <td class="text-right">${emp.stats.averageShiftDuration}h</td>
                        <td class="text-right">${emp.stats.totalBreakHours}h</td>
                    </tr>
                    `;
                }).join('')}
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="2"><strong>TOTALS</strong></td>
                    <td class="text-right">${totals.workDays}</td>
                    <td class="text-right">${totals.totalHours.toFixed(1)}h</td>
                    <td class="text-right">${totals.totalPlannedHours.toFixed(1)}h</td>
                    <td class="text-right ${totals.overtimeHours >= 0 ? 'positive' : 'negative'}">${totals.overtimeHours > 0 ? '+' : ''}${totals.overtimeHours.toFixed(1)}h</td>
                    <td class="text-right">-</td>
                    <td class="text-right">${totals.totalBreakHours.toFixed(1)}h</td>
                </tr>
            </tfoot>
        </table>
        
        <div class="footer">
            Report generated on ${currentDate} • Staff Management System
        </div>
    </div>
    
    <div class="no-print">
        <button class="btn" onclick="window.print()">Print / Save as PDF</button>
        <button class="btn btn-secondary" onclick="window.close()">Close</button>
    </div>
</body>
</html>
            `;

            printWindow.document.write(htmlContent);
            printWindow.document.close();

        } catch (error) {
            console.error('Error generating monthly report:', error);
            setError('Failed to generate monthly report. Please try again.');
        } finally {
            setLoadingMonthly(false);
        }
    };

    const downloadPDFReport = () => {
        const selectedEmp = EMPLOYEES.find(e => String(e.id) === String(selectedEmployee));
        const empName = selectedEmp ? selectedEmp.name : 'Unknown';
        const monthName = months[parseInt(selectedMonth) - 1];
        const currentDate = new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric'
        });

        // Create a new window with the report
        const printWindow = window.open('', '_blank');
        
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Staff Report - ${empName}</title>
    <style>
        @media print {
            @page { margin: 1.5cm; size: A4; }
            body { margin: 0; }
            .no-print { display: none; }
        }
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 40px;
            max-width: 210mm;
            margin: 0 auto;
            background: #f5f5f5;
        }
        
        .report-container {
            background: white;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .header {
            text-align: center;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .header h1 {
            font-size: 24px;
            color: #1e293b;
            margin-bottom: 5px;
        }
        
        .header .subtitle {
            color: #64748b;
            font-size: 14px;
        }
        
        .info-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .info-box {
            background: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #2563eb;
        }
        
        .info-box h3 {
            font-size: 12px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }
        
        .info-box .value {
            font-size: 16px;
            color: #1e293b;
            font-weight: 600;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            border: 1px solid #e2e8f0;
        }
        
        .stat-card .label {
            font-size: 11px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }
        
        .stat-card .value {
            font-size: 24px;
            font-weight: bold;
            color: #1e293b;
        }
        
        .stat-card .unit {
            font-size: 12px;
            color: #64748b;
            margin-top: 2px;
        }
        
        .stat-card.highlight {
            background: #dbeafe;
            border-color: #2563eb;
        }
        
        .stat-card.highlight .value {
            color: #2563eb;
        }
        
        .stat-card.positive .value {
            color: #059669;
        }
        
        .stat-card.negative .value {
            color: #dc2626;
        }
        
        .table-section {
            margin-top: 30px;
        }
        
        .table-section h2 {
            font-size: 16px;
            color: #1e293b;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e2e8f0;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
        }
        
        thead {
            background: #f1f5f9;
        }
        
        th {
            text-align: left;
            padding: 10px 8px;
            font-weight: 600;
            color: #475569;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.3px;
        }
        
        td {
            padding: 10px 8px;
            border-bottom: 1px solid #e2e8f0;
            color: #334155;
        }
        
        tbody tr:hover {
            background: #f8fafc;
        }
        
        .shift-badge {
            background: #dbeafe;
            color: #1e40af;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
            display: inline-block;
        }
        
        .diff-positive { color: #059669; font-weight: 600; }
        .diff-negative { color: #dc2626; font-weight: 600; }
        .diff-neutral { color: #64748b; }
        
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            color: #64748b;
            font-size: 11px;
        }
        
        .no-print {
            text-align: center;
            margin-top: 20px;
            padding: 20px;
        }
        
        .btn {
            background: #2563eb;
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            margin: 0 10px;
        }
        
        .btn:hover {
            background: #1d4ed8;
        }
        
        .btn-secondary {
            background: #64748b;
        }
        
        .btn-secondary:hover {
            background: #475569;
        }
    </style>
</head>
<body>
    <div class="report-container">
        <div class="header">
            <h1>Staff Hours Report</h1>
            <div class="subtitle">${monthName} ${selectedYear}</div>
        </div>
        
        <div class="info-section">
            <div class="info-box">
                <h3>Employee</h3>
                <div class="value">${empName}</div>
            </div>
            <div class="info-box">
                <h3>Role</h3>
                <div class="value">${selectedEmp?.role || 'N/A'}</div>
            </div>
            <div class="info-box">
                <h3>Report Date</h3>
                <div class="value">${currentDate}</div>
            </div>
            <div class="info-box">
                <h3>Period</h3>
                <div class="value">${monthName} ${selectedYear}</div>
            </div>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card highlight">
                <div class="label">Total Hours</div>
                <div class="value">${stats.totalHoursFormatted}</div>
            </div>
            <div class="stat-card">
                <div class="label">Planned</div>
                <div class="value">${stats.totalPlannedHours}</div>
                <div class="unit">hours</div>
            </div>
            <div class="stat-card ${stats.overtimeHours >= 0 ? 'positive' : 'negative'}">
                <div class="label">Difference</div>
                <div class="value">${stats.overtimeHours > 0 ? '+' : ''}${stats.overtimeHours}h</div>
            </div>
            <div class="stat-card">
                <div class="label">Work Days</div>
                <div class="value">${stats.workDays}</div>
                <div class="unit">days</div>
            </div>
            <div class="stat-card">
                <div class="label">Avg Shift</div>
                <div class="value">${stats.averageShiftDuration}</div>
                <div class="unit">hours</div>
            </div>
            <div class="stat-card">
                <div class="label">Breaks</div>
                <div class="value">${stats.totalBreakHours}</div>
                <div class="unit">hours</div>
            </div>
        </div>
        
        <div class="table-section">
            <h2>Time Entries</h2>
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Shift</th>
                        <th>Clock In</th>
                        <th>Clock Out</th>
                        <th>Break</th>
                        <th>Actual</th>
                        <th>Diff</th>
                    </tr>
                </thead>
                <tbody>
                    ${timeEntries.map(entry => {
                        const diff = parseFloat(entry.difference);
                        const diffClass = diff > 0 ? 'diff-positive' : diff < 0 ? 'diff-negative' : 'diff-neutral';
                        return `
                        <tr>
                            <td>${entry.date}</td>
                            <td><span class="shift-badge">${entry.shiftName}</span></td>
                            <td>${entry.clockIn}</td>
                            <td>${entry.clockOut}</td>
                            <td>${entry.breakHours}h</td>
                            <td><strong>${entry.actualHours}h</strong></td>
                            <td class="${diffClass}">${diff > 0 ? '+' : ''}${entry.difference}h</td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="footer">
            Generated by Staff Management System
        </div>
    </div>
    
    <div class="no-print">
        <button class="btn" onclick="window.print()">Print / Save as PDF</button>
        <button class="btn btn-secondary" onclick="window.close()">Close</button>
    </div>
</body>
</html>
        `;
        
        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    const getSelectedEmployeeData = () =>
        EMPLOYEES.find(e => String(e.id) === String(selectedEmployee));

    const getDifferenceColor = (diff) => {
        const val = parseFloat(diff);
        if (val > 0) return 'text-emerald-400';
        if (val < 0) return 'text-rose-400';
        return 'text-slate-400';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-6 md:mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <Users className="w-8 h-8 md:w-10 md:h-10 text-blue-400" />
                    <h1 className="text-3xl md:text-4xl font-bold text-white">Staff Management</h1>
                </div>
                <p className="text-slate-400 text-sm md:text-base">Monitor employee hours and performance metrics</p>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto space-y-6">
                
                {/* Input Section */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-slate-700 shadow-xl">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Search className="w-5 h-5 text-blue-400" />
                        Select Employee & Period
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Employee</label>
                            <select
                                value={selectedEmployee}
                                onChange={(e) => setSelectedEmployee(e.target.value)}
                                className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            >
                                <option value="">Select Employee...</option>
                                {EMPLOYEES.map(emp => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.name} ({emp.role})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Month</label>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            >
                                <option value="">Select Month...</option>
                                {months.map((month, idx) => (
                                    <option key={idx} value={idx + 1}>{month}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Year</label>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            >
                                {years.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mt-4 bg-rose-500/10 border border-rose-500/50 rounded-lg p-3 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                            <p className="text-rose-300 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
                        <button
                            onClick={calculateHours}
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Calculating...
                                </>
                            ) : (
                                <>
                                    <Search className="w-5 h-5" />
                                    Calculate Hours
                                </>
                            )}
                        </button>
                        <button 
                            onClick={downloadPDFReport}
                            disabled={timeEntries.length === 0}
                            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            <Download className="w-5 h-5" />
                            Download PDF Report
                        </button>
                        <button 
                            onClick={downloadMonthlyReport}
                            disabled={loadingMonthly || !selectedMonth || !selectedYear}
                            className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {loadingMonthly ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Users className="w-5 h-5" />
                                    Monthly Report (All Staff)
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Employee Info Card */}
                {selectedEmployee && getSelectedEmployeeData() && (
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-slate-700 shadow-xl">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl md:text-2xl">
                                {getSelectedEmployeeData().name.charAt(0)}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl md:text-2xl font-bold text-white">
                                    {getSelectedEmployeeData().name}
                                </h3>
                                <p className="text-slate-400 text-sm md:text-base">
                                    {getSelectedEmployeeData().role} • {getSelectedEmployeeData().department}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* 📊 STATS GRID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    
                    {/* 1. Total Hours Worked */}
                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 shadow-xl transform hover:scale-[1.02] transition-transform">
                        <div className="flex items-center justify-between mb-3">
                            <Clock className="w-10 h-10 text-white/80" />
                            <span className="text-blue-200 text-xs font-bold tracking-wider">TOTAL WORKED</span>
                        </div>
                        <p className="text-3xl md:text-4xl font-bold text-white mb-1">{stats.totalHoursFormatted}</p>
                        <p className="text-blue-100 text-sm">Actual time recorded</p>
                    </div>

                    {/* 2. Planned Hours */}
                    <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 transform hover:scale-[1.02] transition-transform">
                        <div className="flex items-center justify-between mb-3">
                            <Target className="w-10 h-10 text-purple-400" />
                            <span className="text-slate-400 text-xs font-bold tracking-wider">PLANNED</span>
                        </div>
                        <p className="text-3xl md:text-4xl font-bold text-white mb-1">{stats.totalPlannedHours}</p>
                        <p className="text-slate-400 text-sm">Expected hours</p>
                    </div>

                    {/* 3. Overtime / Undertime */}
                    <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 transform hover:scale-[1.02] transition-transform">
                        <div className="flex items-center justify-between mb-3">
                            {stats.overtimeHours >= 0 ? (
                                <CheckCircle className="w-10 h-10 text-emerald-400" />
                            ) : (
                                <XCircle className="w-10 h-10 text-rose-400" />
                            )}
                            <span className="text-slate-400 text-xs font-bold tracking-wider">DIFFERENCE</span>
                        </div>
                        <p className={`text-3xl md:text-4xl font-bold mb-1 ${stats.overtimeHours >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {stats.overtimeHours > 0 ? '+' : ''}{stats.overtimeHours} hrs
                        </p>
                        <p className="text-slate-400 text-sm">
                            {stats.overtimeHours >= 0 ? 'Overtime' : 'Undertime'}
                        </p>
                    </div>

                    {/* 4. Work Days */}
                    <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 transform hover:scale-[1.02] transition-transform">
                        <div className="flex items-center justify-between mb-3">
                            <Calendar className="w-10 h-10 text-indigo-400" />
                            <span className="text-slate-400 text-xs font-bold tracking-wider">WORK DAYS</span>
                        </div>
                        <p className="text-3xl md:text-4xl font-bold text-white mb-1">{stats.workDays}</p>
                        <p className="text-slate-400 text-sm">Shifts attended</p>
                    </div>

                    {/* 5. Average Shift Duration */}
                    <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 transform hover:scale-[1.02] transition-transform">
                        <div className="flex items-center justify-between mb-3">
                            <TrendingUp className="w-10 h-10 text-cyan-400" />
                            <span className="text-slate-400 text-xs font-bold tracking-wider">AVG SHIFT</span>
                        </div>
                        <p className="text-3xl md:text-4xl font-bold text-white mb-1">{stats.averageShiftDuration}</p>
                        <p className="text-slate-400 text-sm">Hours per shift</p>
                    </div>

                    {/* 6. Total Break Time */}
                    <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 transform hover:scale-[1.02] transition-transform">
                        <div className="flex items-center justify-between mb-3">
                            <Coffee className="w-10 h-10 text-amber-400" />
                            <span className="text-slate-400 text-xs font-bold tracking-wider">BREAK TIME</span>
                        </div>
                        <p className="text-3xl md:text-4xl font-bold text-white mb-1">{stats.totalBreakHours}</p>
                        <p className="text-slate-400 text-sm">Unpaid breaks</p>
                    </div>

                </div>

                {/* Data Table */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-slate-700 shadow-xl">
                    <h2 className="text-lg md:text-xl font-semibold text-white mb-4">Detailed Time Entries</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="border-b border-slate-700">
                                    <th className="py-3 px-4 text-slate-400 text-xs uppercase tracking-wider font-semibold">Date</th>
                                    <th className="py-3 px-4 text-slate-400 text-xs uppercase tracking-wider font-semibold">Shift</th>
                                    <th className="py-3 px-4 text-slate-400 text-xs uppercase tracking-wider font-semibold">Clock In</th>
                                    <th className="py-3 px-4 text-slate-400 text-xs uppercase tracking-wider font-semibold">Clock Out</th>
                                    <th className="py-3 px-4 text-slate-400 text-xs uppercase tracking-wider font-semibold">Break</th>
                                    <th className="py-3 px-4 text-slate-400 text-xs uppercase tracking-wider font-semibold">Planned</th>
                                    <th className="py-3 px-4 text-slate-400 text-xs uppercase tracking-wider font-semibold">Actual</th>
                                    <th className="py-3 px-4 text-slate-400 text-xs uppercase tracking-wider font-semibold text-right">Diff</th>
                                </tr>
                            </thead>
                            <tbody>
                                {timeEntries.length > 0 ? (
                                    timeEntries.map((entry, idx) => {
                                        const diff = parseFloat(entry.difference);
                                        const diffColor = diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-rose-400' : 'text-slate-400';
                                        
                                        return (
                                            <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                                                <td className="py-3 px-4 text-white font-medium">{entry.date}</td>
                                                <td className="py-3 px-4">
                                                    <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded text-xs font-bold uppercase border border-blue-500/30">
                                                        {entry.shiftName}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-slate-300 font-mono text-sm">{entry.clockIn}</td>
                                                <td className="py-3 px-4 text-slate-300 font-mono text-sm">{entry.clockOut}</td>
                                                <td className="py-3 px-4 text-slate-300">{entry.breakHours}h</td>
                                                <td className="py-3 px-4 text-slate-300">{entry.plannedHours}h</td>
                                                <td className="py-3 px-4 text-emerald-400 font-semibold">{entry.actualHours}h</td>
                                                <td className={`py-3 px-4 text-right font-bold ${diffColor}`}>
                                                    {diff > 0 ? '+' : ''}{entry.difference}h
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="py-12 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <Clock className="w-12 h-12 text-slate-600" />
                                                <p className="text-slate-500 text-lg font-medium">
                                                    {loading ? 'Loading data...' : 'No time entries found'}
                                                </p>
                                                {!loading && (
                                                    <p className="text-slate-600 text-sm">
                                                        Select an employee and period, then click "Calculate Hours"
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
