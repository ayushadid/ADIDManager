import React, { useEffect, useState, useRef, useCallback } from 'react';
// ... other imports
import DashboardLayout from '../../components/layouts/DashboardLayout'
import { PRIORITY_DATA } from '../../utils/data'
import axiosInstance from '../../utils/axiosinstance'
import { API_PATHS } from '../../utils/apiPaths'
import toast from 'react-hot-toast'
import { useLocation,useNavigate } from 'react-router-dom'
import moment from 'moment'
import {LuTrash2} from 'react-icons/lu'
import SelectDropdown from '../../components/Inputs/SelectDropdown'
import SelectUsers from '../../components/Inputs/SelectUsers'
import TodoListInput from '../../components/Inputs/TodoListInput'
import AddAttachmentsInput from '../../components/Inputs/AddAttachmentsInput'
import ConfirmationAlert from '../../components/ConfirmationAlert';

// Define a constant for the special "Create" option's value
const CREATE_NEW_PROJECT_VALUE = 'CREATE_NEW_PROJECT';

const defaultTodos = [
  { _id: 'default_done', text: 'Done', completed: false, isDefault: true },
  { _id: 'default_approved', text: 'Approved', completed: false, isDefault: true },
];

const CreateTask = () => {
  const location=useLocation();
  const{taskId}=location.state||{};
  const navigate=useNavigate();
  const [projects, setProjects] = useState([]);

  const [taskData,setTaskData]=useState({
    project:"",
    title:"",
    description:"",
    priority:"Low",
    status: "Pending",
    dueDate:null,
    assignedTo:[],
    todoChecklist:defaultTodos,
    attachments:[],
  });
  
 // In CreateTask.jsx

const fetchAllProjects = async () => {
  try {
    const response = await axiosInstance.get(API_PATHS.PROJECTS.GET_ALL_PROJECTS);
    
    // 👇 Change '_id' to 'value' and 'name' to 'label' here
    const formattedProjects = response.data.map((project) => ({
      value: project._id,
      label: project.name,
    }));

    setProjects(formattedProjects);
  } catch (error) {
    console.error("Error fetching projects", error);
    toast.error("Could not load projects.");
  }
};
useEffect(() => {
  fetchAllProjects(); // Call the function to fetch projects
}, []);

  const [currentTask,setCurrentTask]=useState(null);

  const[error,setError]=useState("");
  const [loading,setLoading]=useState(false);

  const[openDeleteAlert,setOpenDeleteAlert]=useState(false);

const handleValueChange = useCallback((key, value) => {
  setTaskData((prevData) => ({ ...prevData, [key]: value }));
}, []); // The empty array [] means the function is created once and never changes

  

  const clearData=()=>{
    setTaskData({
      project:"",
      title:"",
      description:"",
      priority:"Low",
      dueDate:null,
      assignedTo:[],
      todoChecklist:defaultTodos,
      attachments:[],
    });
  };
  const handleCreateNewProject = async () => {
    const newProjectName = window.prompt("Enter the new project name:");

    if (!newProjectName || newProjectName.trim() === "") {
      toast.error("Project name cannot be empty.");
      return;
    }

    try {
      // Use the API path you defined to create the project
      const response = await axiosInstance.post(API_PATHS.PROJECTS.CREATE_PROJECT, {
        name: newProjectName.trim(),
      });

      if (response.data) {
        const newProject = response.data;
        const formattedNewProject = {
          value: newProject._id,
          label: newProject.name,
        };

        // Update the projects list with the new one
        setProjects((prevProjects) => [...prevProjects, formattedNewProject]);
        
        // Automatically select the new project for the current task
        handleValueChange("project", newProject._id);

        toast.success(`Project "${newProject.name}" created successfully!`);
      }
    } catch (error) {
      console.error("Error creating new project", error);
      toast.error(error.response?.data?.message || "Failed to create project.");
    }
  };

  // This handler checks if the user clicked "Create new project" or a regular one
  const handleProjectSelection = (selectedValue) => {
    if (selectedValue === CREATE_NEW_PROJECT_VALUE) {
      handleCreateNewProject();
    } else {
      handleValueChange("project", selectedValue);
    }
  };
  const createTask=async()=>{
    setLoading(true);

    try{
      const todoList=taskData.todoChecklist?.map((item)=>({
  text: item.text, // Assuming item is now an object
  completed: item.completed || false,
}));

      const response=await axiosInstance.post(API_PATHS.TASKS.CREATE_TASK,{
        ...taskData,
        dueDate: new Date(taskData.dueDate).toISOString(),
        todoChecklist:todoList,
      });

      toast.success("Task Created Successfully");

      clearData();
    }catch(error){
      console.error("Error creating task", error);
      setLoading(false);
    } finally{
      setLoading(false);
    }
  };

  const updateTask=async()=>{
    setLoading(true);

    try{
      const response = await axiosInstance.put(
  API_PATHS.TASKS.UPDATE_TASK(taskId),
  {
    ...taskData,
    dueDate: new Date(taskData.dueDate).toISOString(),
    // taskData.todoChecklist already has the correct format
  }
);
      toast.success("Task Updated")
    }catch(error){
      console.error("Error in updating task",error);
      setLoading(false)
    }finally{
      setLoading(false)
    }
  };
  
  const handleSubmit=async()=>{
    setError(null);

    if (!taskData.project) {
      setError("Please select a project");
      return;
    }
    if(!taskData.title.trim()){
      setError("Title is required");
      return;
    }
    if(!taskData.description.trim()){
      setError("Description is required");
      return;
    }
    if(!taskData.dueDate){
      setError("Due Date is required");
      return;
    }

    if(taskData.assignedTo?.length===0){
      setError("Task not assigned to any member");
      return;
    }

    if(taskData.todoChecklist?.length===0){
      setError("Add atleast one todo task");
      return;
    }

    if(taskId){
      updateTask();
      return;
    }

    createTask();
  };

  const getTaskDetailsById=async()=>{
    try{
      const response=await axiosInstance(API_PATHS.TASKS.GET_TASK_BY_ID(taskId));

      if(response.data){
        const taskInfo=response.data;
        setCurrentTask(taskInfo);

        setTaskData((prevData)=>({
          project:taskInfo.project?._id || "",
          title:taskInfo.title,
          description:taskInfo.description|| "",
          priority:taskInfo.priority,
          status: taskInfo.status,
          dueDate:taskInfo.dueDate
            ?moment(taskInfo.dueDate).format("YYYY-MM-DD")
            :null,
          assignedTo:taskInfo?.assignedTo?.map((item)=>item?._id)||[],
          todoChecklist: taskInfo?.todoChecklist || [],
          attachments: taskInfo?.attachments || [],
        }));
      }
    } catch(error){
      console.error("Fetching Tasks trouble",error);
    }

  };

  const deleteTask=async()=>{
    try{
      await axiosInstance.delete(API_PATHS.TASKS.DELETE_TASK(taskId));

      setOpenDeleteAlert(false);
      toast.success("Task Deleted");
      navigate('/admin/tasks')
    } catch(error){
      console.error("Error deleting",error.response?.message||error.message);
    }
  };
// PASTE THIS NEW CODE in place of the one you deleted

const timeoutRef = useRef(null);

// This function sends the updated checklist to the backend to be saved
const updateChecklistOnBackend = useCallback(async (updatedChecklist) => {
    // Don't run this for new tasks that haven't been created yet
    if (!taskId) return; 

    try {
        await axiosInstance.put(
            API_PATHS.TASKS.UPDATE_TASK_CHECKLIST(taskId),
            { todoChecklist: updatedChecklist }
        );
        console.log("Checklist progress saved to backend.");
    } catch (error) {
        console.error("Failed to save checklist progress", error);
        toast.error("Couldn't save progress.");
    }
}, [taskId]);

// This hook now handles both UI updates and backend saving
// This hook now handles both UI updates and backend saving
useEffect(() => {
  const todoList = taskData.todoChecklist;
  if (!todoList) return;

  // --- Part 1: Update UI status ---
  const completedCount = todoList.filter((item) => item.completed).length;
  let newStatus = "Pending";

  if (todoList.length > 0) {
    if (completedCount === todoList.length) {
      newStatus = "Completed";
    } else if (completedCount > 0) {
      newStatus = "In Progress";
    }
  }

  // This check now safely uses the stable handleValueChange function
  if (taskData.status !== newStatus) {
    handleValueChange("status", newStatus);
  }

  // --- Part 2: Debounce and update backend (with original fix) ---
  // Only try to save progress IF the initial data has already been loaded.
  if (taskId && currentTask) {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      updateChecklistOnBackend(todoList);
    }, 1000);
  }

  // Cleanup timer if the component unmounts
  return () => {
    clearTimeout(timeoutRef.current);
  };

// This updated dependency array is crucial and prevents loops.
}, [
  taskData.todoChecklist,
  taskData.status,
  currentTask,
  taskId,
  handleValueChange,
  updateChecklistOnBackend,
]);
useEffect(() => {
  // Only fetch the task's details if we have a taskId AND the projects have been loaded.
  if (taskId && projects.length > 0) {
    getTaskDetailsById();
  }
}, [taskId, projects]); // 👈 Add 'projects' to the dependency array

  // Add this inside your CreateTask component
const getStatusTagColor = (status) => {
  switch (status) {
    case "In Progress":
      return "text-cyan-500 bg-cyan-50 border border-cyan-500/10";
    case "Completed":
      return "text-lime-500 bg-lime-50 border border-lime-500/20";
    default: // "Pending" or any other status
      return "text-violet-500 bg-violet-50 border border-violet-500/10";
  }
};

  return (
  <DashboardLayout activeMenu="Create Task">
    <div className="mt-5">
      <div className="grid grid-cols-1 md:grid-cols-4 mt-4">
        <div className="form-card col-span-3">
<div className="flex items-center justify-between">
  <div className="flex items-center gap-3">
    <h2 className="text-xl md:text-xl font-medium">
      {taskId ? "Update Task" : "Create Task"}
    </h2>
    {/* ✨ NEW: Status Badge ✨ */}
    {taskId && taskData.status && (
      <div
        className={`text-[13px] font-medium ${getStatusTagColor(
          taskData.status
        )} px-4 py-0.5 rounded`}
      >
        {taskData.status}
      </div>
    )}
  </div>

  {taskId && (
    <button
      className="flex items-center gap-1.5 text-[13px] font-medium text-rose-500 bg-gray-200 rounded px-2 py-1 border border-rose-100 hover:border-rose-300 cursor-pointer"
      onClick={() => setOpenDeleteAlert(true)}
    >
      <LuTrash2 className="text-base" /> Delete
    </button>
  )}
</div>
<div className="mt-4">
              <label className="text-xs font-medium text-slate-600">Project</label>
              <SelectDropdown
                // Prepend the "Create" option to the dynamic projects list
                options={[
                    { value: CREATE_NEW_PROJECT_VALUE, label: "+ Create a new project" },
                    ...projects,
                ]}
                value={taskData.project}
                // Use the new handler function to check for the special value
                onChange={handleProjectSelection}
                placeholder="Select a Project"
              />
            </div>
          <div className='mt-4'>
            <label className="text-xs font-medium text-slate-600">
              Task Title
            </label>
            <input 
              placeholder='Create App UI'
              className='form-input'
              value={taskData.title}
              onChange={({target})=>
                handleValueChange("title",target.value)
              }
            />
          </div>

          <div className='mt-3'>
            <label className="text-xs font-medium text-slate-600">
              Description
            </label>

            <textarea 
              placeholder='Describe task'
              className='form-input'
              rows={4}
              value={taskData.description}
              onChange={({target})=>
                handleValueChange("description",target.value)
              }
            />
          </div>

          <div className="grid grid-cols-12 gap-4 mt-2">
              <div className="col-span-6 md:col-span-4">
              <label className="text-xs font-medium text-slate-600">
                Priority
              </label>
                <SelectDropdown
               options={PRIORITY_DATA}
               value={taskData.priority}
               onChange={(value) => handleValueChange("priority", value)}
               placeholder="Select Priority"
                />
            </div>

            <div className='col-span-6 md:col-span-4'>
              <label className="text-xs font-medium text-slate-600">
                Due Date
              </label>
              <input
                placeholder="Create App UI"
                className='form-input'
                value={taskData.dueDate}
                onChange={({target})=>
                  handleValueChange("dueDate",target.value)
                }
                type="date"
              />
            </div>

            <div className='col-span-12 md:col-span-3'>
              <label className='text-xs font-medium text-slate-600'>
                Assign To
              </label>

              <SelectUsers 
                selectedUsers= {taskData.assignedTo}
                setSelectedUsers={(value=>{
                  handleValueChange("assignedTo",value);
                })}
              />
            </div>
            </div>
            <div className='mt-3'>
              <label className="text-xs font-medium text-slate-600">
                TODO Checklist
              </label>

              <TodoListInput 
                todoList={taskData?.todoChecklist}
                setTodoList={(value)=>
                  handleValueChange("todoChecklist",value)
                }
              />
            </div>

            <div className='mt-3'>
              <label className="text-xs font-medium text-slate-600">
                Add Attachments
              </label>

              <AddAttachmentsInput 
                attachments={taskData?.attachments}
                setAttachments={(value)=>
                  handleValueChange("attachments",value)
                }
              />
            </div>

            {error &&(
              <p className='text-xs font-medium text-red-500 mt-5'>{error}</p>
            )}

            <div className='flex justify-end mt-7'>
              <button
                className='add-btn'
                onClick={handleSubmit}
                disabled={loading}
              >
                {taskId ? "UPDATE TASK":"CREATE TASK"}
              </button>
            </div>
        </div>
      </div>
    </div>
    <ConfirmationAlert
        isOpen={openDeleteAlert}
        onClose={() => setOpenDeleteAlert(false)}
        onConfirm={deleteTask}
        title="Confirm Deletion"
        message="Are you sure you want to delete this task? This action cannot be undone."
    />
  </DashboardLayout>
);

}

export default CreateTask