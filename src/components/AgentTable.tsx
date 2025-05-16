import { useState, useEffect } from 'react';
import { AgentWithContacts } from '@/types/agent';
import { useIsMobile } from '@/hooks/use-mobile';
import { AgentHierarchyModal } from './AgentHierarchyModal';
import { AgentComplaintModal } from "./AgentComplaintModal";
import { useToast } from './ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AgentMobileView } from './agents/AgentMobileView';
import { AgentDesktopView } from './agents/AgentDesktopView';
import { DeleteAgentDialog } from './agents/DeleteAgentDialog';

interface AgentTableProps {
  agents: AgentWithContacts[];
  displayAgents?: AgentWithContacts[];
  title: string;
  showUpline?: boolean;
  filterSiteAdmins?: boolean;
}

export const AgentTable = ({ 
  agents, 
  displayAgents, 
  title, 
  showUpline = true, 
  filterSiteAdmins = true 
}: AgentTableProps) => {
  const isMobile = useIsMobile();
  const [selectedAgent, setSelectedAgent] = useState<AgentWithContacts | null>(null);
  const [isHierarchyModalOpen, setIsHierarchyModalOpen] = useState(false);
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAuthStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session?.user);
    };

    checkAuthStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  const currentPageType = title.includes('সুপার') ? 'super_agent' 
    : title.includes('মাস্টার') ? 'master_agent'
    : title.includes('সাইট এডমিন') ? 'site_admin'
    : title.includes('সাব এডমিন') ? 'sub_admin'
    : null;

  const agentsToDisplay = displayAgents && displayAgents.length > 0 
    ? displayAgents
    : currentPageType && agents && agents.length > 0
      ? agents.filter(agent => agent.type === currentPageType)
      : filterSiteAdmins && agents && agents.length > 0
        ? agents.filter(agent => agent.type !== 'site_admin')
        : agents || [];
  
  const getUplineInfo = (uplineId: string | null) => {
    if (!uplineId) return null;
    return agents.find(agent => agent.id === uplineId) || null;
  };

  const handleDelete = async () => {
    if (!selectedAgent) return;

    try {
      const { error: contactsError } = await supabase
        .from('agent_contacts')
        .delete()
        .eq('agent_id', selectedAgent.id);

      if (contactsError) throw contactsError;

      const { error: agentError } = await supabase
        .from('agents')
        .delete()
        .eq('id', selectedAgent.id);

      if (agentError) throw agentError;

      toast({
        title: "এজেন্ট ডিলিট করা হয়েছে",
        description: "এজেন্টের সমস্ত তথ্য মুছে ফেলা হয়েছে।",
      });

      await queryClient.invalidateQueries({ queryKey: ["all-agents"] });
      await queryClient.invalidateQueries({ queryKey: ["site-admins-with-hierarchy"] });
      await queryClient.invalidateQueries({ queryKey: ["sub-admins-with-hierarchy"] });
      await queryClient.invalidateQueries({ queryKey: ["super-agents-with-hierarchy"] });
      await queryClient.invalidateQueries({ queryKey: ["master-agents-with-hierarchy"] });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "একটি সমস্যা হয়েছে",
        description: error.message,
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setSelectedAgent(null);
    }
  };

  const handleViewHierarchy = (agent: AgentWithContacts) => {
    setSelectedAgent(agent);
    setIsHierarchyModalOpen(true);
  };

  const handleDelete2 = (agent: AgentWithContacts) => {
    setSelectedAgent(agent);
    setIsDeleteDialogOpen(true);
  };

  const handleComplaint = (agent: AgentWithContacts) => {
    setSelectedAgent(agent);
    setIsComplaintModalOpen(true);
  };

  if (isMobile) {
    return (
      <div className="container px-2 py-2">
        <h1 className="text-xl font-bold text-center text-white mb-3">{title}</h1>
        {agentsToDisplay.length > 0 ? (
          <div className="space-y-3">
            {agentsToDisplay.map((agent) => (
              <AgentMobileView
                key={agent.id}
                agent={agent}
                showUpline={showUpline}
                isAuthenticated={isAuthenticated}
                getUplineInfo={getUplineInfo}
                onViewHierarchy={handleViewHierarchy}
                onDelete={handleDelete2}
                onComplaint={handleComplaint}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-lg">No agents found</p>
          </div>
        )}

        <AgentHierarchyModal
          open={isHierarchyModalOpen}
          onOpenChange={setIsHierarchyModalOpen}
          selectedAgent={selectedAgent}
          agents={agents}
        />
        <AgentComplaintModal
          open={isComplaintModalOpen}
          onOpenChange={setIsComplaintModalOpen}
          selectedAgent={selectedAgent}
          uplineAgent={selectedAgent ? getUplineInfo(selectedAgent.reports_to) : null}
        />
        <DeleteAgentDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onConfirm={handleDelete}
        />
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold text-center text-white mb-8">{title}</h1>
      <div className="glass-card">
        {agentsToDisplay.length > 0 ? (
          <AgentDesktopView
            agents={agentsToDisplay}
            showUpline={showUpline}
            isAuthenticated={isAuthenticated}
            getUplineInfo={getUplineInfo}
            onViewHierarchy={handleViewHierarchy}
            onDelete={handleDelete2}
            onComplaint={handleComplaint}
          />
        ) : (
          <div className="text-center py-8">
            <p className="text-lg">No agents found</p>
          </div>
        )}
      </div>

      <AgentHierarchyModal
        open={isHierarchyModalOpen}
        onOpenChange={setIsHierarchyModalOpen}
        selectedAgent={selectedAgent}
        agents={agents}
      />
      <AgentComplaintModal
        open={isComplaintModalOpen}
        onOpenChange={setIsComplaintModalOpen}
        selectedAgent={selectedAgent}
        uplineAgent={selectedAgent ? getUplineInfo(selectedAgent.reports_to) : null}
      />
      <DeleteAgentDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
      />
    </div>
  );
};