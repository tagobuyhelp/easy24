import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Save, X, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectTrigger, SelectValue, SelectItem } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AgentWithContacts } from "@/types/agent";

type AgentManageModalProps = {
  agent?: AgentWithContacts;
  mode: "create" | "edit";
  agentType?: "site_admin" | "sub_admin" | "super_agent" | "master_agent";
  trigger?: React.ReactNode;
  onSuccess?: () => void;
};

export const AgentManageModal = ({
  agent,
  mode,
  agentType,
  trigger,
  onSuccess
}: AgentManageModalProps) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const {
    toast
  } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: agent?.name || "",
    agent_id: agent?.agent_id || "",
    type: agent?.type || agentType || "master_agent",
    reports_to: agent?.reports_to || "",
    whatsapp: agent?.agent_contacts[0]?.whatsapp || "",
    messenger: agent?.agent_contacts[0]?.messenger || ""
  });

  const {
    data: allAgents = []
  } = useQuery({
    queryKey: ['all-agents'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('agents').select(`
          *,
          agent_contacts (*)
        `);
      if (error) throw error;
      return data as AgentWithContacts[];
    }
  });

  const getUplineOptions = (type: string) => {
    const options = (() => {
      switch (type) {
        case 'site_admin':
          return [];
        case 'sub_admin':
          return allAgents.filter(a => a.type === 'site_admin');
        case 'super_agent':
          return allAgents.filter(a => a.type === 'sub_admin');
        case 'master_agent':
          return allAgents.filter(a => a.type === 'super_agent');
        default:
          return [];
      }
    })();

    if (searchTerm) {
      return options.filter(option => option.name.toLowerCase().includes(searchTerm.toLowerCase()) || option.agent_id.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return options;
  };

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      reports_to: ''
    }));
  }, [formData.type]);

  const requiresUpline = (type: string) => {
    return ["sub_admin", "super_agent", "master_agent"].includes(type);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (mode === "create") {
        const {
          data: newAgent,
          error: agentError
        } = await supabase.from("agents").insert({
          name: formData.name,
          agent_id: formData.agent_id,
          type: formData.type,
          reports_to: formData.reports_to || null,
          rating: 1
        }).select().single();
        if (agentError) throw agentError;
        if (formData.whatsapp || formData.messenger) {
          const {
            error: contactsError
          } = await supabase.from("agent_contacts").insert({
            agent_id: newAgent.id,
            whatsapp: formData.whatsapp || null,
            messenger: formData.messenger || null
          });
          if (contactsError) throw contactsError;
        }
        toast({
          title: "এজেন্ট তৈরি সফল হয়েছে",
          description: "নতুন এজেন্ট সফলভাবে যোগ করা হয়েছে।"
        });
      } else {
        if (!agent) throw new Error("No agent provided for update");
        const {
          error: agentError
        } = await supabase.from("agents").update({
          name: formData.name,
          agent_id: formData.agent_id,
          type: formData.type,
          reports_to: formData.reports_to || null
        }).eq("id", agent.id);
        if (agentError) throw agentError;
        if (agent.agent_contacts[0]?.id) {
          const {
            error: contactsError
          } = await supabase.from("agent_contacts").update({
            whatsapp: formData.whatsapp || null,
            messenger: formData.messenger || null
          }).eq("id", agent.agent_contacts[0].id);
          if (contactsError) throw contactsError;
        } else if (formData.whatsapp || formData.messenger) {
          const {
            error: contactsError
          } = await supabase.from("agent_contacts").insert({
            agent_id: agent.id,
            whatsapp: formData.whatsapp || null,
            messenger: formData.messenger || null
          });
          if (contactsError) throw contactsError;
        }
        toast({
          title: "এজেন্ট আপডেট সফল হয়েছে",
          description: "এজেন্টের তথ্য সফলভাবে আপডেট করা হয়েছে।"
        });
      }
      await queryClient.invalidateQueries({
        queryKey: ["all-agents-dashboard"]
      });
      await queryClient.invalidateQueries({
        queryKey: ["site-admins-with-hierarchy"]
      });
      await queryClient.invalidateQueries({
        queryKey: ["sub-admins-with-hierarchy"]
      });
      await queryClient.invalidateQueries({
        queryKey: ["super-agents-with-hierarchy"]
      });
      await queryClient.invalidateQueries({
        queryKey: ["master-agents-with-hierarchy"]
      });
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "একটি সমস্যা হয়েছে",
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const uplineOptions = getUplineOptions(formData.type);

  return <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline" size="sm">
            <UserPlus className="w-4 h-4 mr-2" />
            {mode === "create" ? "নতুন এজেন্ট" : "এজেন্ট আপডেট"}
          </Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] py-[40px] px-[30px] bg-gradient-to-br from-[#1A1704] to-[#261F06] border-primary/20">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "নতুন এজেন্ট যোগ করুন" : "এজেন্টের তথ্য আপডেট করুন"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">নাম</Label>
            <Input id="name" value={formData.name} onChange={e => setFormData({
            ...formData,
            name: e.target.value
          })} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="agent_id">এজেন্ট আইডি</Label>
            <Input id="agent_id" value={formData.agent_id} onChange={e => setFormData({
            ...formData,
            agent_id: e.target.value
          })} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">এজেন্ট টাইপ</Label>
            <Select value={formData.type} onValueChange={(value: any) => setFormData({
            ...formData,
            type: value,
            reports_to: ""
          })} disabled={mode === "edit" || agentType !== undefined}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1F2937] border border-primary/20">
                <SelectItem value="site_admin">সাইট এডমিন</SelectItem>
                <SelectItem value="sub_admin">সাব এডমিন</SelectItem>
                <SelectItem value="super_agent">সুপার এজেন্ট</SelectItem>
                <SelectItem value="master_agent">মাস্টার এজেন্ট</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {requiresUpline(formData.type) && <div className="space-y-2">
              <Label htmlFor="reports_to">আপলাইন</Label>
              <Select value={formData.reports_to} onValueChange={value => setFormData({
            ...formData,
            reports_to: value
          })} required>
                <SelectTrigger>
                  <SelectValue placeholder="আপলাইন নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent className="bg-[#1F2937] border border-primary/20">
                  <div className="p-2 pb-0">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="আপলাইন খুঁজুন..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8" />
                    </div>
                  </div>
                  <div className="p-2">
                    {uplineOptions.length > 0 ? uplineOptions.map(upline => <SelectItem key={upline.id} value={upline.id} className="my-1">
                          {upline.name} ({upline.agent_id})
                        </SelectItem>) : <div className="text-center py-2 text-sm text-muted-foreground">
                        {searchTerm ? "কোন আপলাইন পাওয়া যায়নি" : "কোন আপলাইন নেই"}
                      </div>}
                  </div>
                </SelectContent>
              </Select>
            </div>}
          <div className="space-y-2">
            <Label htmlFor="whatsapp">হোয়াটসঅ্যাপ নম্বর</Label>
            <Input id="whatsapp" value={formData.whatsapp} onChange={e => setFormData({
            ...formData,
            whatsapp: e.target.value
          })} placeholder="WhatsApp নম্বর (ঐচ্ছিক)" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="messenger">মেসেঞ্জার লিংক</Label>
            <Input id="messenger" value={formData.messenger} onChange={e => setFormData({
            ...formData,
            messenger: e.target.value
          })} placeholder="Messenger লিংক (ঐচ্ছিক)" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
              <X className="w-4 h-4 mr-1" />
              বাতিল
            </Button>
            <Button type="submit" disabled={isLoading}>
              <Save className="w-4 h-4 mr-1" />
              {isLoading ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>;
};
