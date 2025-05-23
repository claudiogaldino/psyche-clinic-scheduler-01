
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Appointment } from "@/types/appointment";
import { useAuth } from "@/context/AuthContext";
import { useAppointments } from "@/context/AppointmentContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

interface AppointmentDetailsProps {
  appointment: Appointment;
  onClose: () => void;
}

const AppointmentDetails = ({ appointment, onClose }: AppointmentDetailsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { updateAppointmentStatus, deleteAppointment, findNextAvailableSlot, rescheduleAppointment, updateAppointment } = useAppointments();
  const [isReschedulingOpen, setIsReschedulingOpen] = useState(false);
  const [newDate, setNewDate] = useState<string>(appointment.date);
  const [newStartTime, setNewStartTime] = useState<string>(appointment.startTime);
  const [newEndTime, setNewEndTime] = useState<string>(appointment.endTime);
  const [insuranceToken, setInsuranceToken] = useState<string>(appointment.insuranceToken || "");

  const formattedDate = format(new Date(appointment.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const isAdmin = user?.role === "admin";
  const isReceptionist = user?.role === "receptionist";
  const isPsychologist = user?.role === "psychologist";
  const canManage = isAdmin || isReceptionist || isPsychologist;
  const canEditToken = isAdmin || isReceptionist || isPsychologist;
  
  // Determine if we should show token input (for insurance appointments that are pending OR confirmed)
  const shouldShowTokenInput = appointment.paymentMethod === "insurance" && 
    (appointment.status === "pending" || appointment.status === "confirmed") && 
    canEditToken;

  const handleStatusChange = (status: "pending" | "confirmed" | "cancelled") => {
    updateAppointmentStatus(appointment.id, status);
  };

  const handleDelete = () => {
    if (window.confirm("Tem certeza que deseja cancelar este agendamento?")) {
      deleteAppointment(appointment.id);
      onClose();
    }
  };

  const handleOpenReschedule = () => {
    // Encontra o próximo horário disponível para o psicólogo
    const nextSlot = findNextAvailableSlot(appointment.psychologistId);
    
    if (nextSlot) {
      setNewDate(format(nextSlot.date, 'yyyy-MM-dd'));
      setNewStartTime(nextSlot.startTime);
      setNewEndTime(nextSlot.endTime);
    }
    
    setIsReschedulingOpen(true);
  };

  const handleReschedule = () => {
    rescheduleAppointment(appointment.id, newDate, newStartTime, newEndTime);
    setIsReschedulingOpen(false);
  };

  const handleSaveToken = () => {
    const updatedAppointment = {
      ...appointment,
      insuranceToken
    };
    updateAppointment(updatedAppointment);
    
    toast({
      title: "Token salvo",
      description: "O token do convênio foi salvo com sucesso.",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "text-green-700 bg-green-100";
      case "pending":
        return "text-yellow-700 bg-yellow-100";
      case "cancelled":
        return "text-red-700 bg-red-100";
      case "completed":
        return "text-blue-700 bg-blue-100";
      default:
        return "text-gray-700 bg-gray-100";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "confirmed":
        return "Confirmado";
      case "pending":
        return "Pendente";
      case "cancelled":
        return "Cancelado";
      case "completed":
        return "Concluído";
      default:
        return status;
    }
  };

  // Log for debugging
  console.log("Appointment details:", {
    paymentMethod: appointment.paymentMethod,
    status: appointment.status,
    canEditToken,
    shouldShowTokenInput
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-500">Paciente</p>
          <p className="font-medium">{appointment.patient.name}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Data</p>
          <p className="font-medium">{formattedDate}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Horário</p>
          <p className="font-medium">{appointment.startTime} - {appointment.endTime}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Psicólogo</p>
          <p className="font-medium">{appointment.psychologistName}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Sala</p>
          <p className="font-medium">{appointment.roomName}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Método de Pagamento</p>
          <p className="font-medium">
            {appointment.paymentMethod === "private" ? "Particular" : `Convênio (${appointment.insuranceType})`}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Valor</p>
          <p className="font-medium">R$ {appointment.value.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Status</p>
          <div className="flex items-center mt-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
              {getStatusText(appointment.status)}
            </span>
          </div>
        </div>
      </div>

      {/* Token input for insurance plans */}
      {shouldShowTokenInput && (
        <div className="pt-4 border-t border-gray-200">
          <div className="space-y-3">
            <Label htmlFor="insuranceToken">Token do Plano de Saúde</Label>
            <div className="flex space-x-2">
              <Input
                id="insuranceToken"
                value={insuranceToken}
                onChange={(e) => setInsuranceToken(e.target.value)}
                placeholder="Digite o código de autorização"
                className="flex-1"
              />
              <Button onClick={handleSaveToken} className="whitespace-nowrap">
                Salvar Token
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              O token é importante para controle e rastreamento dos atendimentos realizados via convênio.
            </p>
          </div>
        </div>
      )}

      {canManage && (
        <div className="pt-4 border-t border-gray-200">
          <div className="space-y-3">
            <Label htmlFor="status">Atualizar Status</Label>
            <Select
              defaultValue={appointment.status}
              onValueChange={(value) => handleStatusChange(value as any)}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="confirmed">Confirmado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        {canManage && (
          <>
            <Button variant="outline" onClick={handleOpenReschedule}>
              Reagendar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Cancelar Agendamento
            </Button>
          </>
        )}
        <Button onClick={onClose}>Fechar</Button>
      </div>

      {/* Modal de reagendamento */}
      <Dialog open={isReschedulingOpen} onOpenChange={setIsReschedulingOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reagendar Consulta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newDate">Nova Data</Label>
              <Input
                id="newDate"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="newStartTime">Horário de Início</Label>
                <Input
                  id="newStartTime"
                  type="time"
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="newEndTime">Horário de Término</Label>
                <Input
                  id="newEndTime"
                  type="time"
                  value={newEndTime}
                  onChange={(e) => setNewEndTime(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsReschedulingOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleReschedule}>
                Confirmar Reagendamento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppointmentDetails;
