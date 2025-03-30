
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const UserSchedules = () => {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load schedules from localStorage
    const storedSchedules = localStorage.getItem('userSchedules');
    if (storedSchedules) {
      try {
        const parsedSchedules = JSON.parse(storedSchedules);
        // Process dates to be Date objects
        const processedSchedules = parsedSchedules.map((schedule: any) => ({
          ...schedule,
          dates: schedule.dates.map((dateInfo: any) => ({
            ...dateInfo,
            date: new Date(dateInfo.date)
          }))
        }));
        setSchedules(processedSchedules);
      } catch (error) {
        console.error('Error parsing schedules:', error);
        setSchedules([]);
      }
    } else {
      setSchedules([]);
    }
    setIsLoading(false);
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Escalas dos Utilizadores</CardTitle>
          <CardDescription>Visualize todas as escalas submetidas pelos utilizadores</CardDescription>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center">
              <div className="animate-pulse text-gray-500">A carregar escalas...</div>
            </div>
          ) : schedules.length === 0 ? (
            <div className="py-10 text-center">
              <div className="text-gray-500">Não existem escalas submetidas.</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilizador</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Mês</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Turnos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.flatMap((schedule) => 
                  schedule.dates.map((dateInfo: any, dateIndex: number) => (
                    <TableRow key={`${schedule.email}-${dateIndex}`}>
                      {dateIndex === 0 ? (
                        <>
                          <TableCell rowSpan={schedule.dates.length} className="font-medium">{schedule.user}</TableCell>
                          <TableCell rowSpan={schedule.dates.length}>{schedule.email}</TableCell>
                          <TableCell rowSpan={schedule.dates.length}>{schedule.month}</TableCell>
                        </>
                      ) : null}
                      <TableCell>{format(new Date(dateInfo.date), "d 'de' MMMM", { locale: pt })}</TableCell>
                      <TableCell>
                        {dateInfo.shifts.map((shift: string) => (
                          <span key={shift} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-1">
                            {shift === "manha" ? "Manhã" : shift === "tarde" ? "Tarde" : "Noite"}
                          </span>
                        ))}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserSchedules;
