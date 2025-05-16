import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { AgentTable } from '@/components/AgentTable';
import { supabase } from '@/integrations/supabase/client';
import { AgentWithContacts } from '@/types/agent';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CustomerSupport } from '@/components/CustomerSupport';

const fetchSuperAgents = async () => {
  try {
    // First, fetch all potential uplines (site admins and sub admins)
    const { data: uplines, error: uplinesError } = await supabase
      .from('agents')
      .select(`
        *,
        agent_contacts (*)
      `)
      .in('type', ['site_admin', 'sub_admin']);

    if (uplinesError) throw uplinesError;

    // Then fetch super agents
    const { data: superAgents, error: superAgentsError } = await supabase
      .from('agents')
      .select(`
        *,
        agent_contacts (*)
      `)
      .eq('type', 'super_agent');

    if (superAgentsError) throw superAgentsError;

    // Finally fetch master agents (potential downlines)
    const { data: masterAgents, error: masterAgentsError } = await supabase
      .from('agents')
      .select(`
        *,
        agent_contacts (*)
      `)
      .eq('type', 'master_agent');

    if (masterAgentsError) throw masterAgentsError;

    // Manually shuffle the super agents
    const shuffledSuperAgents = superAgents ? [...superAgents].sort(() => Math.random() - 0.5) : [];
    
    // Combine all data for complete hierarchy information
    return [
      ...shuffledSuperAgents, 
      ...(uplines || []), 
      ...(masterAgents || [])
    ] as AgentWithContacts[];
  } catch (error) {
    console.error("Error fetching super agents:", error);
    return [];
  }
};

const SuperAgent = () => {
  const [showWarning, setShowWarning] = useState(true);
  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['super-agents-with-hierarchy'],
    queryFn: fetchSuperAgents,
  });

  const superAgents = agents.filter(agent => agent.type === 'super_agent');

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1704] via-[#261F06] to-[#1F1903]">
      <Header />
      <div className="container mx-auto px-2 sm:px-6 py-2 md:py-6">
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowWarning(!showWarning)}
            className="absolute right-2 top-2 z-10"
          >
            {showWarning ? (
              <>
                <ChevronUp className="mr-1" />
                <span className="hidden sm:inline">সরান</span>
              </> 
            ) : (
              <>
                <ChevronDown className="mr-1" />
                <span className="hidden sm:inline">দেখান</span>
              </>
            )}
          </Button>
          {showWarning && (
            <div className="glass-card p-4 sm:p-6 mb-6">
              <div className="flex gap-3 items-start">
                <AlertTriangle className="w-5 h-5 text-yellow-500 mt-1 flex-shrink-0" />
                <div className="space-y-3">
                  <p className="warning-title text-yellow-500 font-semibold">
                    এজেন্ট দের সাথে লেনদেন এর আগে ইজি২৪ এর নিয়ম গুলো জেনে নিন!!
                  </p>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="warning-text flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <strong className="text-yellow-500 shrink-0">প্রতারনার হাত থেকে বাচতে সবার আগে ভিজিট করুন ইজি২৪ সাইটঃ</strong>
                      <a 
                        href="http://easy24.site" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-blue-400 hover:text-blue-300 break-all sm:break-normal"
                      >
                        WWW.EASY24.SITE
                      </a>
                    </li>
                    <li className="warning-text">
                      <strong className="text-yellow-500">হোয়াটসঅ্যাপ ব্যাতিত অন্য কোন এপ এর মাধ্যমে যোগাযোগ বা লেনদেন করা যাবে না এবং করলে তা গ্রহনযোগ্য হবে না।</strong>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="text-center">Loading...</div>
          </div>
        ) : (
          <AgentTable 
            agents={agents}
            displayAgents={superAgents}
            title="EASY24 সুপার এজেন্ট লিস্ট"
            filterSiteAdmins={false}
          />
        )}
      </div>
      <Footer />
      <CustomerSupport />
    </div>
  );
};

export default SuperAgent;