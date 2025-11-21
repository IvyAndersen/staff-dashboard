import React, { useState } from 'react';
import { Users, Clock, Calendar, TrendingUp, Search, Download, Target, Coffee, AlertCircle } from 'lucide-react';

export default function StaffDashboard() {
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('');
    const [selectedYear, setSelectedYear] = useState('2025'); 
    const [loading, setLoading] = useState(false);
    
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

    // 🔒 Static employees list
    const EMPLOYEES = [
        { id: 8, name: 'Elzbieta Karpinska', role: 'Chef', department: 'General' },
        { id: 9, name: 'Bohdan Zavhorodnii', role: 'Chef', department: 'General' },
        { id: 10, name: 'Lotte Bruin', role: 'Waiter', department: 'General' },
        { id: 11, name: 'Steffen Bjerk', role: 'Waiter', department: 'General' },
        { id: 12, name: 'Helene Göpfert', role: 'Waiter', department: 'General' },
        { id: 13, name: 'Michelle Pavan', role: 'Waiter', department: 'General' },
        { id: 14, name: 'Annabelle Cazals', role: 'Waiter', department: 'General' },
        { id: 15, name: 'Julia Gasser', role: 'Waiter', department: 'General' },
        { id: 16, name: 'Marit Jonsdotter Gåsvatn', role: 'Waiter', department: 'General' },
        { id: 17, name: 'Oliver heszlein-lossius.', role: 'Waiter', department: 'General' },
        { id: 18, name: 'Gustav James Myklestad Barrett', role: 'Waiter', department: 'General' },
        { id: 19, name: 'Joel Rimu Laurance', role: 'Helper', department: 'General' },
        { id: 20, name: 'Yericka Italia Ruggeri', role: 'Waiter', department: 'General' },
        { id: 21, name: 'Victoria Tamas', role: 'Waiter', department: 'General' },
    ];

    const N8N_WEBHOOKS = {
        calculateHours: 'https://primary-production-191cf.up.railway.app/webhook/Calculate_Hours'
    };

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const years = ['2024', '2025'];

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
            alert('Please select an employee, month, and year');
            return;
        }

        setLoading(true);
        
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

            // 🛠️ FIX: Handle both Object (your current case) and Array (just in case)
            let summary = rawData;
            if (Array.isArray(rawData)) {
                if (rawData.length > 0) {
                    summary = rawData[0];
                } else {
                    summary = null;
                }
            }

            if (summary) {
                setStats({
                    totalHoursFormatted: shortenDuration(summary.totalHoursFormatted),
                    totalPlannedHours: summary.totalPlannedHours || 0,
                    overtimeHours: summary.overtimeHours || 0,
                    workDays: summary.workDays || 0,
                    averageShiftDuration: summary.averageShiftDuration || 0,
                    totalBreakHours: summary.totalBreakHours || 0
                });

                const entries = Array.isArray(summary.entries) ? summary.entries : [];
                const formattedEntries = entries.map(item => ({
                    date: item.date,
                    clockIn: formatTime(item.clockIn),
                    clockOut: formatTime(item.clockOut),
                    shiftName: item.shiftName,
                    breakHours: item.breakHours,
                    plannedHours: item.plannedHours,
                    actualHours: item.actualHours
                }));

                formattedEntries.sort((a, b) => new Date(b.date) - new Date(a.date));
                setTimeEntries(formattedEntries);
            } else {
                console.warn("Received empty data structure.");
            }

        } catch (error) {
            console.error('Error calculating hours:', error);
            alert('Error fetching data.');
        } finally {
            setLoading(false);
        }
    };

    const downloadCSVReport = () => {
        const selectedEmp = EMPLOYEES.find(e => String(e.id) === String(selectedEmployee));
        const empName = selectedEmp ? selectedEmp.name : 'Unknown';
        
        let csv = 'Staff Hours Report\n\n';
        csv += `Employee,${empName}\n`;
        csv += `Period,${selectedMonth}/${selectedYear}\n\n`;
        
        csv += 'Summary\n';
        csv += `Total Hours,${stats.totalHoursFormatted}\n`;
        csv += `Planned Hours,${stats.totalPlannedHours}\n`;
        csv += `Overtime,${stats.overtimeHours}\n`;
        csv += `Work Days,${stats.workDays}\n`;
        csv += `Avg Shift,${stats.averageShiftDuration}\n\n`;

        csv += 'Date,Shift,Clock In,Clock Out,Break (Hrs),Planned (Hrs),Actual (Hrs)\n';

        timeEntries.forEach(entry => {
            csv += `${entry.date},${entry.shiftName},${entry.clockIn},${entry.clockOut},${entry.breakHours},${entry.plannedHours},${entry.actualHours}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `report_${empName.replace(' ', '_')}.csv`;
        document.body.appendChild(link);
        link.click();
    };

    const getSelectedEmployeeData = () =>
        EMPLOYEES.find(e => String(e.id) === String(selectedEmployee));

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <Users className="w-10 h-10 text-blue-400" />
                    <h1 className="text-4xl font-bold text-white">Staff Management</h1>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto space-y-6">
                
                {/* Input Section */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 shadow-xl">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <select
                            value={selectedEmployee}
                            onChange={(e) => setSelectedEmployee(e.target.value)}
                            className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600 outline-none"
                        >
                            <option value="">Select Employee...</option>
                            {EMPLOYEES.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                        </select>

                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600 outline-none"
                        >
                            <option value="">Select Month...</option>
                            {months.map((month, idx) => (
                                <option key={idx} value={idx + 1}>{month}</option>
                            ))}
                        </select>

                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600 outline-none"
                        >
                            {years.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={calculateHours}
                            disabled={loading}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-all"
                        >
                            {loading ? 'Calculating...' : 'Calculate'}
                        </button>
                        <button 
                            onClick={downloadCSVReport}
                            disabled={timeEntries.length === 0}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-all flex justify-center items-center gap-2"
                        >
                            <Download className="w-5 h-5" /> CSV Export
                        </button>
                    </div>
                </div>

                {/* 📊 STATS GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    
                    {/* 1. Total Hours Worked */}
                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-2">
                            <Clock className="w-8 h-8 text-white/80" />
                            <span className="text-blue-200 text-sm font-bold">TOTAL WORKED</span>
                        </div>
                        <p className="text-3xl font-bold text-white mb-1">{stats.totalHoursFormatted}</p>
                        <p className="text-blue-100 text-sm">Actual time recorded</p>
                    </div>

                    {/* 2. Planned Hours */}
                    <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                            <Target className="w-8 h-8 text-purple-400" />
                            <span className="text-slate-400 text-sm font-bold">PLANNED</span>
                        </div>
                        <p className="text-3xl font-bold text-white mb-1">{stats.totalPlannedHours} hrs</p>
                        <p className="text-slate-400 text-sm">Expected schedule</p>
                    </div>

                    {/* 3. Overtime / Undertime */}
                    <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                            <AlertCircle className={`w-8 h-8 ${stats.overtimeHours >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} />
                            <span className="text-slate-400 text-sm font-bold">DIFFERENCE</span>
                        </div>
                        <p className={`text-3xl font-bold mb-1 ${stats.overtimeHours >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {stats.overtimeHours > 0 ? '+' : ''}{stats.overtimeHours} hrs
                        </p>
                        <p className="text-slate-400 text-sm">Overtime / Undertime</p>
                    </div>

                    {/* 4. Work Days */}
                    <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                            <Calendar className="w-8 h-8 text-indigo-400" />
                            <span className="text-slate-400 text-sm font-bold">WORK DAYS</span>
                        </div>
                        <p className="text-3xl font-bold text-white mb-1">{stats.workDays} days</p>
                        <p className="text-slate-400 text-sm">Shifts attended</p>
                    </div>

                    {/* 5. Average Shift Duration */}
                    <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                            <TrendingUp className="w-8 h-8 text-cyan-400" />
                            <span className="text-slate-400 text-sm font-bold">AVG SHIFT</span>
                        </div>
                        <p className="text-3xl font-bold text-white mb-1">{stats.averageShiftDuration} hrs</p>
                        <p className="text-slate-400 text-sm">Average duration</p>
                    </div>

                    {/* 6. Total Break Time */}
                    <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                            <Coffee className="w-8 h-8 text-amber-400" />
                            <span className="text-slate-400 text-sm font-bold">BREAK TIME</span>
                        </div>
                        <p className="text-3xl font-bold text-white mb-1">{stats.totalBreakHours} hrs</p>
                        <p className="text-slate-400 text-sm">Total unpaid breaks</p>
                    </div>

                </div>

                {/* Employee Info */}
                {selectedEmployee && getSelectedEmployeeData() && (
                    <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700">
                        <h3 className="text-slate-400 text-sm uppercase tracking-wider font-bold mb-1">Selected Employee</h3>
                        <p className="text-xl text-white font-semibold">
                            {getSelectedEmployeeData().name} 
                            <span className="text-slate-500 text-lg font-normal mx-2">|</span> 
                            <span className="text-blue-400">{getSelectedEmployeeData().role}</span>
                        </p>
                    </div>
                )}

                {/* Data Table */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 shadow-xl">
                    <h2 className="text-xl font-semibold text-white mb-4">Detailed Entries</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-700 text-slate-400 text-sm uppercase">
                                    <th className="py-3 px-4">Date</th>
                                    <th className="py-3 px-4">Shift</th>
                                    <th className="py-3 px-4">Clock In</th>
                                    <th className="py-3 px-4">Clock Out</th>
                                    <th className="py-3 px-4">Break (h)</th>
                                    <th className="py-3 px-4">Planned</th>
                                    <th className="py-3 px-4 text-right">Actual</th>
                                </tr>
                            </thead>
                            <tbody className="text-slate-300">
                                {timeEntries.length > 0 ? (
                                    timeEntries.map((entry, idx) => (
                                        <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                                            <td className="py-3 px-4 text-white font-medium">{entry.date}</td>
                                            <td className="py-3 px-4">
                                                <span className="bg-slate-700 text-blue-300 px-2 py-1 rounded text-xs uppercase font-bold">
                                                    {entry.shiftName}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">{entry.clockIn}</td>
                                            <td className="py-3 px-4">{entry.clockOut}</td>
                                            <td className="py-3 px-4">{entry.breakHours}</td>
                                            <td className="py-3 px-4">{entry.plannedHours} hrs</td>
                                            <td className="py-3 px-4 text-right text-emerald-400 font-bold">{entry.actualHours} hrs</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="py-8 text-center text-slate-500 italic">
                                            {loading ? 'Loading data...' : 'No entries found.'}
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
