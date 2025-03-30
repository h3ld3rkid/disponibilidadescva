
import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 pointer-events-auto", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 w-full",
        month: "space-y-4 w-full",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-md font-semibold",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse border border-gray-200 rounded-md overflow-hidden",
        head_row: "flex w-full bg-gray-200",
        head_cell:
          "text-muted-foreground rounded-md font-semibold text-center text-gray-700 p-3 bg-gray-200 flex-1",
        row: "flex w-full mt-0",
        cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 border border-gray-200 flex-1 aspect-square h-16 w-16 md:h-20 md:w-20 lg:h-24 lg:w-24",
        day: cn(
          "h-full w-full p-0 font-normal aria-selected:opacity-100 cursor-pointer"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-[#6E59A5] text-white hover:bg-[#9b87f5] hover:text-white focus:bg-[#6E59A5] focus:text-white",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-5 w-5" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-5 w-5" />,
        // Fix to ensure custom Day component receives proper props
        Day: (props) => {
          // Extract only the necessary props
          const { date, displayMonth } = props;
          // Create a dayProps object that includes onClick if it exists
          const dayProps = {
            onClick: props.onClick,
            disabled: props.disabled,
            selected: props.selected,
            today: props.today,
            outside: props.outside,
            children: props.children,
          };
          
          // Now pass both date and dayProps to custom Day component
          if (props.component) {
            return props.component({ date, dayProps });
          }
          return props.children;
        },
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
