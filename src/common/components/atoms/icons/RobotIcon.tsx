import React from "react";
import { RiRobot2Line } from "react-icons/ri";

const RobotIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <RiRobot2Line
    className={`${className} text-current`}
    aria-hidden="true"
  />
);

export default RobotIcon;
