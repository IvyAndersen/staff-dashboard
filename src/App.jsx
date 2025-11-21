import React, { useState } from 'react';
import { Users, Clock, Calendar, TrendingUp, Search, Download } from 'lucide-react';

export default function StaffDashboard() {
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('');
    const [selectedYear, setSelectedYear] = useState('2025'); 
    const [loading, setLoading] = useState(false);
    const [hoursData, setHoursData] = useState({
        totalHours: 0,
        workDays: 0,
        avgHoursPerDay: 0,
        overtimeHours: 0
    });
    const [timeEntries, setTimeEntries] = useState([]);

    // 🔒 Static employees list
    // NOTE: If n8n uses Airtable Record IDs (e.g., "rec..."), replace these numbers with those IDs.
    // Otherwise, we will send the 'name' to n8n to filter by name.
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

    // Helper to format ISO string to HH:MM
    const formatTime = (isoString) => {
        if (!isoString) return '--:--';
        try {
            // Takes 2025-11-11T07:25:43.466Z and returns 07:25
            return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        } catch (e) {
            return isoString;
        }
    };

    const calculateHours = async () => {
        if (!selectedEmployee || !selectedMonth || !selectedYear) {
            alert('Please select an employee, month, and year');
            return;
        }

        setLoading(true);
        // Reset data while loading
        setHoursData({ totalHours: 0, workDays: 0, avgHoursPerDay: 0, overtimeHours: 0 });
        setTimeEntries([]);

        try {
            // 1. Prepare Dates
            const startDate = new Date(selectedYear, selectedMonth - 1, 1)
                .toISOString()
                .split('T')[0];
            const endDate = new Date(selectedYear, selectedMonth, 0)
                .toISOString()
                .split('T')[0];

            // 2. Find Employee Name
            const empObj = EMPLOYEES.find(e => String(e.id) === String(selectedEmployee));
            
            console.log(`Fetching for: ${empObj.name} (ID: ${selectedEmployee}) from ${startDate} to ${endDate}`);

            // 3. Call n8n
            const response = await fetch(N8N_WEBHOOKS.calculateHours, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employeeId: selectedEmployee, // Sends '10'
                    employeeName: empObj ? empObj.name : '', // Sends 'Lotte Bruin' (USE THIS IN N8N IF ID FAILS)
                    startDate,
                    endDate
                })
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const rawData = await response.json();
            console.log("📦 Raw Data received from n8n:", rawData);

            // 4. Process Data
            if (Array.isArray(rawData) && rawData.length > 0) {
                
                // --- Statistics Calculation ---
                const totalHours = rawData.reduce((sum, item) => sum + (item.actualHours || 0), 0);
                const workDays = rawData.length;
                const avgHoursPerDay = workDays > 0 ? (totalHours / workDays) : 0;
                
                // Sum 'diffHours' only if positive (assuming diffHours is overtime)
                const overtimeHours = rawData.reduce((sum, item) => {
                    const diff = item.diffHours || 0;
                    return sum + (diff > 0 ? diff : 0);
                }, 0);

                setHoursData({
                    totalHours: parseFloat(totalHours.toFixed(2)),
                    workDays: workDays,
                    avgHoursPerDay: parseFloat(avgHoursPerDay.toFixed(2)),
                    overtimeHours: parseFloat(overtimeHours.toFixed(2))
                });

                // --- Table Data Mapping ---
                const formattedEntries = rawData.map(item => ({
                    date: item.Date,
                    clockIn: formatTime(item['Clock In']),
                    clockOut: formatTime(item['Clock Out']),
                    breakTime: item['Break Duration'] ? `${item['Break Duration']} min` : '0 min',
                    totalHours: item.actualHours?.toFixed(2) || '0.00',
                    notes: item.shiftName || '' 
                }));

                // Sort Newest -> Oldest
                formattedEntries.sort((a, b) => new Date(b.date) - new Date(a.date));
                
                setTimeEntries(formattedEntries);
            } else {
                console.warn("⚠️ n8n returned an empty array. Check if n8n is filtering by ID '10' instead of Name 'Lotte Bruin'.");
                alert("Connection successful, but no records found. \n\nCheck Console (F12) for details. \nLikely cause: n8n filter needs to match Employee Name, not ID.");
            }

        } catch (error) {
            console.error('❌ Error calculating hours:', error);
            alert('Failed to fetch data. Check Console for CORS or Network errors.');
        } finally {
            setLoading(false);
        }
    };

    const downloadCSVReport = () => {
        const selectedEmp = EMPLOYEES.find(e => String(e.id) === String(selectedEmployee));
        const empName = selectedEmp ? selectedEmp.name : 'Unknown';
        const monthName = selectedMonth ? months[parseInt(selectedMonth) - 1] : 'N/A';

        let csv = 'Staff Hours Report\n\n';
        csv += `Employee Name,${empName}\n`;
        csv += `Role,${selectedEmp ? selectedEmp.role : 'N/A'}\n`;
        csv += `Period,${monthName} ${selectedYear}\n\n`;

        csv += 'Summary\n';
        csv += `Total Hours Worked,${hoursData.totalHours}\n`;
        csv += `Work Days,${hoursData.workDays}\n`;
        csv += `Overtime Hours,${hoursData.overtimeHours}\n\n`;

        csv += 'Date,Clock In,Clock Out,Break,Total Hours,Shift\n';

        const safeEntries = Array.isArray(timeEntries) ? timeEntries : [];
        safeEntries.forEach(entry => {
            csv += `${entry.date},${entry.clockIn},${entry.clockOut},${entry.breakTime},${entry.totalHours},${entry.notes}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `report_${empName.replace(' ', '_')}.csv`);
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
                <p className="text-slate-400 text-lg">Monitor employee hours and performance</p>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Selection Panel */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 shadow-xl">
                    <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <Search className="w-5 h-5 text-blue-400" />
                        Select Employee & Period
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Employee</label>
                            <select
                                value={selectedEmployee}
                                onChange={(e) => setSelectedEmployee(e.target.value)}
                                className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600 focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">Select an employee...</option>
                                {EMPLOYEES.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Month</label>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600 focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">Select month...</option>
                                {months.map((month, idx) => (
                                    <option key={idx} value={idx + 1}>{month}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Year</label>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600 focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                {years.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={calculateHours}
                            disabled={loading}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-all transform hover:scale-105 shadow-lg"
                        >
                            {loading ? 'Calculating...' : 'Calculate Hours'}
                        </button>
                        <button 
                            onClick={downloadCSVReport}
                            disabled={timeEntries.length === 0}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white font-semibold py-3 px-6 rounded-lg transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
                        >
                            <Download className="w-5 h-5" />
                            Download Report (CSV)
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-2">
                            <Clock className="w-8 h-8 text-white/80" />
                            <span className="text-blue-200 text-sm font-medium">TOTAL</span>
                        </div>
                        <p className="text-4xl font-bold text-white mb-1">{hoursData.totalHours}</p>
                        <p className="text-blue-100 text-sm">Hours Worked</p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-2">
                            <Calendar className="w-8 h-8 text-white/80" />
                            <span className="text-purple-200 text-sm font-medium">DAYS</span>
                        </div>
                        <p className="text-4xl font-bold text-white mb-1">{hoursData.workDays}</p>
                        <p className="text-purple-100 text-sm">Work Days</p>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-2">
                            <TrendingUp className="w-8 h-8 text-white/80" />
                            <span className="text-emerald-200 text-sm font-medium">AVG</span>
                        </div>
                        <p className="text-4xl font-bold text-white mb-1">{hoursData.avgHoursPerDay}</p>
                        <p className="text-emerald-100 text-sm">Hours per Day</p>
                    </div>

                    <div className="bg-gradient-to-br from-amber-600 to-amber-700 rounded-2xl p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-2">
                            <Clock className="w-8 h-8 text-white/80" />
                            <span className="text-amber-200 text-sm font-medium">EXTRA</span>
                        </div>
                        <p className="text-4xl font-bold text-white mb-1">{hoursData.overtimeHours}</p>
                        <p className="text-amber-100 text-sm">Overtime Hours</p>
                    </div>
                </div>

                {/* Employee Info */}
                {selectedEmployee && getSelectedEmployeeData() && (
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 shadow-xl">
                        <h2 className="text-xl font-semibold text-white mb-4">Employee Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <p className="text-slate-400 text-sm mb-1">Name</p>
                                <p className="text-white font-medium text-lg">{getSelectedEmployeeData().name}</p>
                            </div>
                            <div>
                                <p className="text-slate-400 text-sm mb-1">Role</p>
                                <p className="text-white font-medium text-lg">{getSelectedEmployeeData().role}</p>
                            </div>
                            <div>
                                <p className="text-slate-400 text-sm mb-1">Department</p>
                                <p className="text-white font-medium text-lg">{getSelectedEmployeeData().department}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Time Entries Table */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 shadow-xl">
                    <h2 className="text-xl font-semibold text-white mb-4">Time Entries</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-700">
                                    <th className="text-left text-slate-300 font-medium py-3 px-4">Date</th>
                                    <th className="text-left text-slate-300 font-medium py-3 px-4">Clock In</th>
                                    <th className="text-left text-slate-300 font-medium py-3 px-4">Clock Out</th>
                                    <th className="text-left text-slate-300 font-medium py-3 px-4">Break</th>
                                    <th className="text-left text-slate-300 font-medium py-3 px-4">Total Hours</th>
                                    <th className="text-left text-slate-300 font-medium py-3 px-4">Shift</th>
                                </tr>
                            </thead>
                            <tbody>
                                {timeEntries.length > 0 ? (
                                    timeEntries.map((entry, idx) => (
                                        <tr key={idx} className="hover:bg-slate-700/30 border-b border-slate-700/50">
                                            <td className="py-3 px-4 text-white">{entry.date}</td>
                                            <td className="py-3 px-4 text-slate-300">{entry.clockIn}</td>
                                            <td className="py-3 px-4 text-slate-300">{entry.clockOut}</td>
                                            <td className="py-3 px-4 text-slate-300">{entry.breakTime}</td>
                                            <td className="py-3 px-4 text-emerald-400 font-semibold">{entry.totalHours} hrs</td>
                                            <td className="py-3 px-4 text-slate-400 text-sm">{entry.notes}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="py-8 text-center text-slate-500">
                                            {loading ? 'Loading...' : 'No data available for selected period.'}
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
