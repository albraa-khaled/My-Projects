import gymnasium as gym
import numpy as np
from gymnasium.wrappers import RecordEpisodeStatistics, RecordVideo
q_table = np.load("q_table.npy")

env = gym.make("FrozenLake-v1", is_slippery=False, render_mode="rgb_array", map_name="4x4")
env = RecordVideo(env, video_folder="videos", name_prefix="eval", episode_trigger=lambda x: True)
state = env.reset()[0]
done = False
path = [state]

while not done:
    action = np.argmax(q_table[state])
    state, reward, terminated, truncated, _ = env.step(action)
    done = terminated or truncated
    path.append(state)

print("🎮 Agent path:", path)
print("🏁 Final reward:", reward)

output = env.render()
print(output)
env.close()
