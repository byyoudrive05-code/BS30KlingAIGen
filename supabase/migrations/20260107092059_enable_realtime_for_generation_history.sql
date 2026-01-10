/*
  # Enable Realtime for Generation History

  1. Changes
    - Enable realtime publication for generation_history table
    - This allows frontend to subscribe to changes in generation_history table in real-time
  
  2. Purpose
    - Enable instant updates when video generation status changes
    - Allow user role to see real-time blocking when a video is processing
    - Improve user experience with immediate feedback
*/

-- Enable realtime for generation_history table
ALTER PUBLICATION supabase_realtime ADD TABLE generation_history;
