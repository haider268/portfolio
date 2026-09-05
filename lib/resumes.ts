/* One list, two consumers: the résumé section on the homepage and the agent's
   get_resume_section tool. If a PDF is added or relabelled it changes here and
   both surfaces follow. */
export type Resume = {
  file: string;
  role: string;
  /** the role this version is aimed at, in that reader's language */
  who: string;
};

export const RESUMES: Resume[] = [
  {
    file: "haider-ali-voice-ai.pdf",
    role: "Production Voice AI",
    who: "For a realtime voice team. The STT → LLM → TTS loop, telephony on Twilio and SIP, routing and transfers, and speech-provider tuning against the latency-versus-quality tradeoff.",
  },
  {
    file: "haider-ali-applied-ai.pdf",
    role: "Applied AI & Automation",
    who: "The broadest of the four, and the closest to this site. Systems that respond in seconds, qualify, book, and run operations without supervision.",
  },
  {
    file: "haider-ali-automation.pdf",
    role: "Automation Engineering",
    who: "For a workflow and integration role. Event-driven pipelines across CRMs and APIs, middleware logic, and the plumbing that keeps them honest.",
  },
  {
    file: "haider-ali-robotics-cv.pdf",
    role: "Robotics & Embedded — full CV",
    who: "Where the reliability habits come from. Autonomy, SLAM and sensor fusion; modern C++, ROS, embedded Linux, and field deployment.",
  },
];

export const CONTACT = {
  email: "haiderali2689832@gmail.com",
  linkedin: "https://www.linkedin.com/in/haiderali514",
};
