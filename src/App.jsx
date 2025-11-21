import React, { useState } from 'react';
import { Users, Clock, Calendar, TrendingUp, Search, Download, Target, Coffee, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export default function StaffDashboard() {
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('');
    const [selectedYear, setSelectedYear] = useState('2025'); 
    const [loading, setLoading] = useState(false);
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

    const downloadCSVReport = () => {
        const selectedEmp = EMPLOYEES.find(e => String(e.id) === String(selectedEmployee));
        const empName = selectedEmp ? selectedEmp.name : 'Unknown';
        const monthName = months[parseInt(selectedMonth) - 1];
        const currentDate = new Date().toLocaleString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        // Create a professional, well-formatted CSV
        let csv = '';
        
        // Header Section with Company Branding
        csv += '═══════════════════════════════════════════════════════════\n';
        csv += '                   STAFF HOURS REPORT                      \n';
        csv += '═══════════════════════════════════════════════════════════\n\n';
        
        // Employee Information Section
        csv += '┌─────────────────────────────────────────────────────────┐\n';
        csv += '│ EMPLOYEE INFORMATION                                    │\n';
        csv += '└─────────────────────────────────────────────────────────┘\n';
        csv += `Name:,${empName}\n`;
        csv += `Role:,${selectedEmp?.role || 'N/A'}\n`;
        csv += `Department:,${selectedEmp?.department || 'N/A'}\n`;
        csv += `Employee ID:,${selectedEmployee}\n\n`;
        
        // Report Period Section
        csv += '┌─────────────────────────────────────────────────────────┐\n';
        csv += '│ REPORT PERIOD                                           │\n';
        csv += '└─────────────────────────────────────────────────────────┘\n';
        csv += `Month:,${monthName} ${selectedYear}\n`;
        csv += `Generated:,${currentDate}\n\n`;
        
        // Summary Statistics Section
        csv += '┌─────────────────────────────────────────────────────────┐\n';
        csv += '│ SUMMARY STATISTICS                                      │\n';
        csv += '└─────────────────────────────────────────────────────────┘\n';
        csv += 'Metric,Value,Unit\n';
        csv += `Total Hours Worked,${stats.totalHoursFormatted.replace(' hrs', 'h').replace(' min', 'm')},\n`;
        csv += `Planned Hours,${stats.totalPlannedHours},hours\n`;
        csv += `Overtime/Undertime,${stats.overtimeHours > 0 ? '+' : ''}${stats.overtimeHours},hours\n`;
        csv += `Work Days,${stats.workDays},days\n`;
        csv += `Average Shift Duration,${stats.averageShiftDuration},hours\n`;
        csv += `Total Break Time,${stats.totalBreakHours},hours\n\n`;
        
        // Performance Indicators
        csv += '┌─────────────────────────────────────────────────────────┐\n';
        csv += '│ PERFORMANCE INDICATORS                                  │\n';
        csv += '└─────────────────────────────────────────────────────────┘\n';
        const attendanceRate = stats.workDays > 0 ? 100 : 0;
        const complianceRate = stats.totalPlannedHours > 0 
            ? ((stats.totalPlannedHours - Math.abs(stats.overtimeHours)) / stats.totalPlannedHours * 100).toFixed(1)
            : 0;
        csv += `Attendance Rate,${attendanceRate}%,\n`;
        csv += `Schedule Compliance,${complianceRate}%,\n`;
        csv += `Status,${stats.overtimeHours >= 0 ? 'On Target' : 'Below Target'},\n\n`;

        // Detailed Time Entries Section
        csv += '┌─────────────────────────────────────────────────────────┐\n';
        csv += '│ DETAILED TIME ENTRIES                                   │\n';
        csv += '└─────────────────────────────────────────────────────────┘\n';
        csv += 'Date,Day of Week,Shift Type,Clock In,Clock Out,Break (h),Planned (h),Actual (h),Difference (h),Status\n';

        timeEntries.forEach(entry => {
            const date = new Date(entry.date);
            const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
            const diff = parseFloat(entry.difference);
            const status = diff > 0 ? 'Overtime' : diff < 0 ? 'Undertime' : 'On Time';
            
            csv += `${entry.date},${dayOfWeek},${entry.shiftName},${entry.clockIn},${entry.clockOut},${entry.breakHours},${entry.plannedHours},${entry.actualHours},${diff > 0 ? '+' : ''}${entry.difference},${status}\n`;
        });
        
        // Footer Section
        csv += '\n┌─────────────────────────────────────────────────────────┐\n';
        csv += '│ NOTES & OBSERVATIONS                                    │\n';
        csv += '└─────────────────────────────────────────────────────────┘\n';
        
        if (stats.overtimeHours > 2) {
            csv += `• Employee has accumulated ${stats.overtimeHours} hours of overtime\n`;
        } else if (stats.overtimeHours < -2) {
            csv += `• Employee is ${Math.abs(stats.overtimeHours)} hours below scheduled time\n`;
        } else {
            csv += '• Employee hours are within expected range\n';
        }
        
        if (stats.averageShiftDuration > 8) {
            csv += `• Average shift duration (${stats.averageShiftDuration}h) exceeds standard 8 hours\n`;
        }
        
        csv += '\n═══════════════════════════════════════════════════════════\n';
        csv += '           Report generated by Staff Management System      \n';
        csv += '═══════════════════════════════════════════════════════════\n';

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Staff_Report_${empName.replace(/\s+/g, '_')}_${monthName}_${selectedYear}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
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
                            onClick={downloadCSVReport}
                            disabled={timeEntries.length === 0}
                            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            <Download className="w-5 h-5" />
                            Export CSV Report
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
                                <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                                    <th className="py-3 px-4 font-semibold">Date</th>
                                    <th className="py-3 px-4 font-semibold">Shift</th>
                                    <th className="py-3 px-4 font-semibold">Clock In</th>
                                    <th className="py-3 px-4 font-semibold">Clock Out</th>
                                    <th className="py-3 px-4 font-semibold">Break</th>
                                    <th className="py-3 px-4 font-semibold">Planned</th>
                                    <th className="py-3 px-4 font-semibold">Actual</th>
                                    <th className="py-3 px-4 font-semibold text-right">Diff</th>
                                </tr>
                            </thead>
                            <tbody className="text-slate-300">
                                {timeEntries.length > 0 ? (
                                    timeEntries.map((entry, idx) => (
                                        <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                                            <td className="py-3 px-4 text-white font-medium">{entry.date}</td>
                                            <td className="py-3 px-4">
                                                <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs font-bold uppercase border border-blue-500/30">
                                                    {entry.shiftName}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 font-mono text-sm">{entry.clockIn}</td>
                                            <td className="py-3 px-4 font-mono text-sm">{entry.clockOut}</td>
                                            <td className="py-3 px-4">{entry.breakHours}h</td>
                                            <td className="py-3 px-4">{entry.plannedHours}h</td>
                                            <td className="py-3 px-4 text-emerald-400 font-semibold">{entry.actualHours}h</td>
                                            <td className={`py-3 px-4 text-right font-bold ${getDifferenceColor(entry.difference)}`}>
                                                {parseFloat(entry.difference) > 0 ? '+' : ''}{entry.difference}h
                                            </td>
                                        </tr>
                                    ))
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
