import React, { useState, useEffect } from 'react';
import { Users, Clock, Calendar, TrendingUp, Search, Download } from 'lucide-react';

export default function StaffDashboard() {
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('');
    const [selectedYear, setSelectedYear] = useState('2024');
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hoursData, setHoursData] = useState({
        totalHours: 0,
        workDays: 0,
        avgHoursPerDay: 0,
        overtimeHours: 0
    });
    const [timeEntries, setTimeEntries] = useState([]);

    // === EDIT THESE WEBHOOK URLs FROM YOUR N8N ===
    const N8N_WEBHOOKS = {
        getEmployees: 'https://primary-production-191cf.up.railway.app/webhook/get-employees2',
        getTimeEntries: 'https://primary-production-191cf.up.railway.app/webhook/GetEmployeeTimeEntries',
        calculateHours: 'https://primary-production-191cf.up.railway.app/webhook/Calculate_Hours'
    };

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const years = ['2024', '2025'];

    // Fetch employees on component mount
    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            const response = await fetch(N8N_WEBHOOKS.getEmployees);
            const data = await response.json();

            // Ensure we always get an array
            const rawArray = Array.isArray(data)
                ? data
                : Array.isArray(data.employees)
                    ? data.employees
                    : data
                        ? [data]
                        : [];

            // Normalize Airtable-style fields -> { id, name, role, department }
            const employeeList = rawArray.map((emp, index) => ({
                id: emp['Staff ID'] ?? emp.id ?? index,
                name: emp.Name ?? emp.name ?? 'Unknown',
                role: emp.Roll ?? emp.role ?? 'Staff',
                department: emp.department ?? 'General',
            }));

            setEmployees(employeeList);
        } catch (error) {
            console.error('Error fetching employees:', error);
            // Fallback to sample data if webhook fails
            setEmployees([
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
            ]);
        }
    };

    const calculateHours = async () => {
        if (!selectedEmployee || !selectedMonth || !selectedYear) {
            alert('Please select an employee, month, and year');
            return;
        }

        setLoading(true);

        try {
            // Calculate start and end dates for the selected month
            const startDate = new Date(selectedYear, selectedMonth - 1, 1)
                .toISOString()
                .split('T')[0];
            const endDate = new Date(selectedYear, selectedMonth, 0)
                .toISOString()
                .split('T')[0];

            const response = await fetch(N8N_WEBHOOKS.calculateHours, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employeeId: selectedEmployee,
                    startDate,
                    endDate
                })
            });

            const data = await response.json();

            setHoursData({
                totalHours: data.totalHours || 0,
                workDays: data.workDays || 0,
                avgHoursPerDay: data.avgHoursPerDay || 0,
                overtimeHours: data.overtimeHours || 0
            });

            // Ensure entries is always an array
            const entries = Array.isArray(data.entries) ? data.entries : [];
            setTimeEntries(entries);
        } catch (error) {
            console.error('Error calculating hours:', error);
            alert('Failed to calculate hours. Check console for details.');
        } finally {
            setLoading(false);
        }
    };

    // Function to generate and download CSV report
    const downloadCSVReport = () => {
        const safeEmployees = Array.isArray(employees) ? employees : [];
        const selectedEmp = safeEmployees.find(e => String(e.id) === String(selectedEmployee));
        const empName = selectedEmp ? selectedEmp.name : 'Unknown';
        const monthName = selectedMonth ? months[parseInt(selectedMonth) - 1] : 'N/A';

        // CSV Header
        let csv = 'Staff Hours Report\n\n';
        csv += `Employee Name,${empName}\n`;
        csv += `Role,${selectedEmp ? selectedEmp.role : 'N/A'}\n`;
        csv += `Department,${selectedEmp ? selectedEmp.department : 'N/A'}\n`;
        csv += `Period,${monthName} ${selectedYear}\n\n`;

        csv += 'Summary\n';
        csv += `Total Hours Worked,${hoursData.totalHours}\n`;
        csv += `Work Days,${hoursData.workDays}\n`;
        csv += `Average Hours per Day,${hoursData.avgHoursPerDay}\n`;
        csv += `Overtime Hours,${hoursData.overtimeHours}\n\n`;

        csv += 'Date,Clock In,Clock Out,Break Time,Total Hours,Adjusted Hours,Notes\n';

        const safeEntries = Array.isArray(timeEntries) ? timeEntries : [];

        // Add time entries
        safeEntries.forEach(entry => {
            csv += `${entry.date},${entry.clockIn},${entry.clockOut},${entry.breakTime},${entry.totalHours},,\n`;
        });

        // Create blob and download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute(
            'download',
            `staff_report_${empName.replace(' ', '_')}_${monthName}_${selectedYear}.csv`
        );
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Helper to get selected employee object
    const getSelectedEmployeeData = () => {
        const safeEmployees = Array.isArray(employees) ? employees : [];
        return safeEmployees.find(e => String(e.id) === String(selectedEmployee));
    };

    const safeEmployees = Array.isArray(employees) ? employees : [];
    const safeTimeEntries = Array.isArray(timeEntries) ? timeEntries : [];

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
                        {/* Employee Selector */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Employee
                            </label>
                            <select
                                value={selectedEmployee}
                                onChange={(e) => setSelectedEmployee(e.target.value)}
                                className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            >
                                <option value="">Select an employee...</option>
                                {safeEmployees.map(emp => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Month Selector */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Month
                            </label>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            >
                                <option value="">Select month...</option>
                                {months.map((month, idx) => (
                                    <option key={idx} value={idx + 1}>
                                        {month}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Year Selector */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Year
                            </label>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            >
                                {years.map(year => (
                                    <option key={year} value={year}>
                                        {year}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={calculateHours}
                            disabled={loading}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-all transform hover:scale-105 shadow-lg"
                        >
                            {loading ? 'Calculating...' : 'Calculate Hours'}
                        </button>
                        <button className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-6 rounded-lg transition-all transform hover:scale-105 shadow-lg">
                            View Details
                        </button>
                        <button
                            onClick={downloadCSVReport}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
                        >
                            <Download className="w-5 h-5" />
                            Download Report (CSV)
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Total Hours */}
                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-2">
                            <Clock className="w-8 h-8 text-white/80" />
                            <span className="text-blue-200 text-sm font-medium">TOTAL</span>
                        </div>
                        <p className="text-4xl font-bold text-white mb-1">{hoursData.totalHours}</p>
                        <p className="text-blue-100 text-sm">Hours Worked</p>
                    </div>

                    {/* Work Days */}
                    <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-2">
                            <Calendar className="w-8 h-8 text-white/80" />
                            <span className="text-purple-200 text-sm font-medium">DAYS</span>
                        </div>
                        <p className="text-4xl font-bold text-white mb-1">{hoursData.workDays}</p>
                        <p className="text-purple-100 text-sm">Work Days</p>
                    </div>

                    {/* Average Hours */}
                    <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-2">
                            <TrendingUp className="w-8 h-8 text-white/80" />
                            <span className="text-emerald-200 text-sm font-medium">AVG</span>
                        </div>
                        <p className="text-4xl font-bold text-white mb-1">{hoursData.avgHoursPerDay}</p>
                        <p className="text-emerald-100 text-sm">Hours per Day</p>
                    </div>

                    {/* Overtime */}
                    <div className="bg-gradient-to-br from-amber-600 to-amber-700 rounded-2xl p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-2">
                            <Clock className="w-8 h-8 text-white/80" />
                            <span className="text-amber-200 text-sm font-medium">EXTRA</span>
                        </div>
                        <p className="text-4xl font-bold text-white mb-1">{hoursData.overtimeHours}</p>
                        <p className="text-amber-100 text-sm">Overtime Hours</p>
                    </div>
                </div>

                {/* Employee Info Card */}
                {selectedEmployee && getSelectedEmployeeData() && (
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 shadow-xl">
                        <h2 className="text-xl font-semibold text-white mb-4">Employee Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <p className="text-slate-400 text-sm mb-1">Name</p>
                                <p className="text-white font-medium text-lg">
                                    {getSelectedEmployeeData().name}
                                </p>
                            </div>
                            <div>
                                <p className="text-slate-400 text-sm mb-1">Role</p>
                                <p className="text-white font-medium text-lg">
                                    {getSelectedEmployeeData().role}
                                </p>
                            </div>
                            <div>
                                <p className="text-slate-400 text-sm mb-1">Department</p>
                                <p className="text-white font-medium text-lg">
                                    {getSelectedEmployeeData().department}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Time Entries Table */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 shadow-xl">
                    <h2 className="text-xl font-semibold text-white mb-4">Recent Time Entries</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-700">
                                    <th className="text-left text-slate-300 font-medium py-3 px-4">
                                        Date
                                    </th>
                                    <th className="text-left text-slate-300 font-medium py-3 px-4">
                                        Clock In
                                    </th>
                                    <th className="text-left text-slate-300 font-medium py-3 px-4">
                                        Clock Out
                                    </th>
                                    <th className="text-left text-slate-300 font-medium py-3 px-4">
                                        Break
                                    </th>
                                    <th className="text-left text-slate-300 font-medium py-3 px-4">
                                        Total Hours
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {safeTimeEntries.map((entry, idx) => (
                                    <tr
                                        key={idx}
                                        className={`${
                                            idx < safeTimeEntries.length - 1
                                                ? 'border-b border-slate-700/50'
                                                : ''
                                        } hover:bg-slate-700/30`}
                                    >
                                        <td className="py-3 px-4 text-white">{entry.date}</td>
                                        <td className="py-3 px-4 text-slate-300">{entry.clockIn}</td>
                                        <td className="py-3 px-4 text-slate-300">{entry.clockOut}</td>
                                        <td className="py-3 px-4 text-slate-300">{entry.breakTime}</td>
                                        <td className="py-3 px-4 text-emerald-400 font-semibold">
                                            {entry.totalHours} hrs
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
