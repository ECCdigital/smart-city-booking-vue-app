import store from "@/store";
export default {
  async getWorkflow(tenantId) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    try {
      const workflow = await ApiClient.get(`api/${t}/workflow`, {
        withCredentials: true,
      });
      return workflow.data;
    } catch (error) {
      console.error(error);
    }
  },
  async getWorkflowStates(tenantId) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    try {
      const workflow = await ApiClient.get(`api/${t}/workflow/states`, {
        withCredentials: true,
      });
      return workflow.data;
    } catch (error) {
      console.error(error);
    }
  },
  async createWorkflow(workflow, tenantId) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    try {
      const newWorkflow = await ApiClient.post(
        `api/${t}/workflow`,
        workflow,
        {
          withCredentials: true,
        }
      );
      return newWorkflow.data;
    } catch (error) {
      console.error(error);
    }
  },

  async updateWorkflow(workflow, tenantId) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    try {
      const updatedWorkflow = await ApiClient.put(
        `api/${t}/workflow`,
        workflow,
        {
          withCredentials: true,
        }
      );
      return updatedWorkflow.data;
    } catch (error) {
      console.error(error);
    }
  },
  async updateTask(
    { taskId, operation, destination, newIndex, oldIndex },
    tenantId
  ) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    try {
      const workflow = await ApiClient.put(
        `api/${t}/workflow/task`,
        {
          taskId: taskId,
          operation: operation,
          destination: destination,
          newIndex: newIndex,
          oldIndex: oldIndex || null,
        },
        {
          withCredentials: true,
        }
      );
      return workflow.data;
    } catch (error) {
      console.error(error);
    }
  },

  async archiveTask({ taskId }, tenantId) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    try {
      const workflow = await ApiClient.put(
        `api/${t}/workflow/archive`,
        {
          taskId: taskId,
        },
        {
          withCredentials: true,
        }
      );
      return workflow.data;
    } catch (error) {
      console.error(error);
    }
  },

  async getBacklog(tenantId) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    try {
      const backlog = await ApiClient.get(`api/${t}/workflow/backlog`, {
        withCredentials: true,
      });
      return backlog.data;
    } catch (error) {
      console.error(error);
    }
  },
};
