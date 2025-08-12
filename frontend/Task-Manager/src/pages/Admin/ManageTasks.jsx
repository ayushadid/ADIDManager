import React, { useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosinstance';
import { API_PATHS } from '../../utils/apiPaths';
import { UserContext } from '../../context/userContext';

// Components
import DashboardLayout from '../../components/layouts/DashboardLayout';
import TaskStatusTab from '../../components/TaskStatusTab';
import TaskCard from '../../components/cards/TaskCard';
import AiCommandInterface from '../../components/AiCommandInterface.jsx'; // 1. Import the new component

// Icons
import { LuRadioTower } from 'react-icons/lu';
import { FaTimes, FaUsers } from 'react-icons/fa';

const ManageTasks = () => {
    // State for data and loading
    const [displayedTasks, setDisplayedTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [projects, setProjects] = useState([]);
    const [tabs, setTabs] = useState([]);
    const [users, setUsers] = useState([]); // State to hold the list of users

    // State for all filters
    const [filterStatus, setFilterStatus] = useState("All");
    const [selectedProject, setSelectedProject] = useState('all');
    const [dueDateFilter, setDueDateFilter] = useState('');
    const [createdDateFilter, setCreatedDateFilter] = useState('');
    const [selectedUserId, setSelectedUserId] = useState('all'); // Replaced 'assignmentFilter'

    // State for "Live Tasks" feature
    const [showLiveOnly, setShowLiveOnly] = useState(false);
    const [liveTasks, setLiveTasks] = useState([]);

    const { user: currentUser } = useContext(UserContext); // Renamed for clarity
    const navigate = useNavigate();

    // Primary data fetching function with all server-side filters
    const fetchTasks = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();

            // Handle status and overdue filters
            if (filterStatus === 'Overdue') {
                params.append('isOverdue', 'true');
            } else if (filterStatus !== 'All') {
                params.append('status', filterStatus);
            }
            
            // Handle new user assignment filter
            if (selectedUserId !== 'all') {
                params.append('assignedUserId', selectedUserId);
            }

            // Append other active filters
            if (selectedProject !== 'all') params.append('projectId', selectedProject);
            if (dueDateFilter) params.append('dueDate', dueDateFilter);
            if (createdDateFilter) params.append('createdDate', createdDateFilter);

            // The backend secures the data based on the user's role and the passed params
            const response = await axiosInstance.get(`${API_PATHS.TASKS.GET_ALL_TASKS}?${params.toString()}`);

            setDisplayedTasks(response.data?.tasks || []);
            
            // Construct the tabs array including the 'Overdue' count from the API
            const statusSummary = response.data?.statusSummary || {};
            const statusArray = [
                { label: "All", count: statusSummary.all || 0 },
                { label: "Overdue", count: statusSummary.overdueTasks || 0 },
                { label: "Pending", count: statusSummary.pendingTasks || 0 },
                { label: "In Progress", count: statusSummary.inProgressTasks || 0 },
                { label: "Completed", count: statusSummary.completedTasks || 0 },
            ];
            setTabs(statusArray);

        } catch (error) {
            console.error("Error fetching tasks:", error);
            setDisplayedTasks([]);
        } finally {
            setIsLoading(false);
        }
    }, [filterStatus, selectedProject, dueDateFilter, createdDateFilter, selectedUserId]);

    // Effect to fetch all users for the dropdown (for admins only)
    useEffect(() => {
        if (currentUser?.role === 'admin') {
            const getUsers = async () => {
                try {
                    const response = await axiosInstance.get(API_PATHS.USERS.GET_ALL_USERS);
                    const data = response.data;

                    // This handles if the API returns {users: [...]} OR just [...]
                    const userList = Array.isArray(data?.users) ? data.users : Array.isArray(data) ? data : [];
                    setUsers(userList);
                } catch (error) {
                    console.error("Error fetching users:", error);
                }
            };
            getUsers();
        }
    }, [currentUser?.role]);

    // Effect to fetch the list of projects for the dropdown
    useEffect(() => {
        const getProjects = async () => {
            try {
                const projectResponse = await axiosInstance.get(API_PATHS.PROJECTS.GET_ALL_PROJECTS);
                setProjects(Array.isArray(projectResponse.data) ? projectResponse.data : []);
            } catch (error) {
                console.error("Error fetching projects:", error);
                setProjects([]);
            }
        };
        getProjects();
    }, []);

    // Effect to fetch tasks when any filter changes
    useEffect(() => {
        if (!showLiveOnly) {
            fetchTasks();
        }
    }, [fetchTasks, showLiveOnly]);

    // Effect to handle the "Live Tasks" toggle
    useEffect(() => {
        if (showLiveOnly) {
            const fetchLiveTasks = async () => {
                setIsLoading(true);
                try {
                    const response = await axiosInstance.get(API_PATHS.TIMELOGS.GET_ACTIVE_TIMELOGS);
                    const activeTasks = response.data.map(log => log.task);
                    setLiveTasks(activeTasks);
                } catch (error) {
                    console.error("Error fetching live tasks:", error);
                    setLiveTasks([]);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchLiveTasks();
        }
    }, [showLiveOnly]);

    // Handler to clear all filters to their default state
    const handleClearFilters = () => {
        setSelectedProject('all');
        setDueDateFilter('');
        setCreatedDateFilter('');
        setFilterStatus('All');
        setSelectedUserId('all'); // Clear the user dropdown
    };

    // Handler for clicking a task card to navigate
    const handleClick = (taskData) => {
        navigate(`/admin/create-task`, { state: { taskId: taskData._id } });
    };

    const tasksToRender = showLiveOnly ? liveTasks : displayedTasks;

    return (
        <DashboardLayout activeMenu="Manage Tasks">
            <div className='my-5'>
                {/* Header and Live Tasks Toggle */}
                <div className='flex flex-col md:flex-row md:items-center justify-between'>
                    <h2 className='text-xl md:text-xl font-medium'>Manage Tasks</h2>
                    <div className="flex items-center gap-4">
                        <label htmlFor="live-toggle" className="flex items-center cursor-pointer">
                            <LuRadioTower className={`mr-2 ${showLiveOnly ? 'text-red-500 animate-pulse' : 'text-slate-400'}`} />
                            <span className={`text-sm font-medium ${showLiveOnly ? 'text-red-500' : 'text-slate-600'}`}>Live Tasks</span>
                            <div className="relative ml-3">
                                <input type="checkbox" id="live-toggle" className="sr-only" checked={showLiveOnly} onChange={() => setShowLiveOnly(!showLiveOnly)} />
                                <div className={`block ${showLiveOnly ? 'bg-red-500' : 'bg-gray-200'} w-12 h-6 rounded-full transition`}></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${showLiveOnly ? 'transform translate-x-6' : ''}`}></div>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Filter Controls */}
                <fieldset disabled={showLiveOnly || isLoading} className={`my-4 p-4 bg-white rounded-lg shadow-sm disabled:opacity-40 transition`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Project</label>
                            <select className="form-input text-sm w-full" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
                                <option value="all">All Projects</option>
                                {projects.map((project) => (<option key={project._id} value={project._id}>{project.name}</option>))}
                            </select>
                        </div>
                        
                        {/* User Assignment Dropdown (Admin only) */}
                        {currentUser?.role === 'admin' && (
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Assigned To</label>
                                <div className="relative">
                                    <FaUsers className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <select 
                                        className="form-input text-sm w-full pl-9" 
                                        value={selectedUserId} 
                                        onChange={(e) => setSelectedUserId(e.target.value)}
                                    >
                                        <option value="all">All Users</option>
                                        {users.map((user) => (
                                            <option key={user._id} value={user._id}>{user.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Due Date</label>
                            <div className="relative">
                                <input type="date" className="form-input text-sm w-full pr-10" value={dueDateFilter} onChange={(e) => setDueDateFilter(e.target.value)} />
                                {dueDateFilter && (
                                    <button onClick={() => setDueDateFilter('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                        <FaTimes />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Created Date</label>
                            <div className="relative">
                                <input type="date" className="form-input text-sm w-full pr-10" value={createdDateFilter} onChange={(e) => setCreatedDateFilter(e.target.value)} />
                                {createdDateFilter && (
                                    <button onClick={() => setCreatedDateFilter('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                        <FaTimes />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 text-right">
                        <button onClick={handleClearFilters} className="text-sm text-blue-600 hover:underline font-medium">Clear All Filters</button>
                    </div>
                </fieldset>

                {/* Status Tabs (hidden in live mode) */}
                {!showLiveOnly && (
                   <div className="flex items-center gap-3 mt-4 md:mt-0">
                      <TaskStatusTab tabs={tabs} activeTab={filterStatus} setActiveTab={setFilterStatus} />
                   </div>
                )}

                {/* Task Grid & Loading/Empty State */}
                <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mt-4'>
                    {isLoading ? (
                        <div className="text-center py-10 text-gray-500 col-span-3">Loading tasks...</div>
                    ) : tasksToRender.length > 0 ? (
                        tasksToRender.map((item) => (
                            <TaskCard key={item._id} task={item} onClick={() => handleClick(item)} />
                        ))
                    ) : (
                        <div className="text-center py-10 text-gray-500 col-span-3">
                            {showLiveOnly ? "No tasks are currently active." : "No tasks match the current filters."}
                        </div>
                    )}
                </div>
            </div>

            {/* 2. Render the AI Command Interface (Admin Only) */}
            {currentUser?.role === 'admin' && (
                <AiCommandInterface 
                    onTaskCreated={fetchTasks}
                />
            )}
        </DashboardLayout>
    );
};

export default ManageTasks;