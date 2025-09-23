from stable_baselines3.common.evaluation import evaluate_policy
from stable_baselines3 import PPO
from stable_baselines3.common.monitor import Monitor
import gymnasium as gym
from gymnasium.wrappers import RecordVideo
from matplotlib import pyplot as plt
import numpy as np
# Replace with the path to your local .zip file
local_model_path = "ppo-BipedalWalker-v3.zip"

# Load the model
model = PPO.load(local_model_path, print_system_info=True)
eval_env = Monitor(gym.make("BipedalWalker-v3", hardcore=True,render_mode='rgb_array'))
eval_env = RecordVideo(eval_env, "videos", episode_trigger=lambda x: True, name_prefix="ppo-BipedalWalker-v3")
episode_rewards = []
success_rate = 0
for episode in range(10):
    obs, _ = eval_env.reset()
    done = False
    episode_reward = 0
    while not done:
        action, _ = model.predict(obs, deterministic=True)
        obs, reward, terminated, truncated, _ = eval_env.step(action)
        done = terminated or truncated
        episode_reward += reward
    if episode_reward >100:
        success_rate += 1
    episode_rewards.append(episode_reward)
    print(f"Episode {episode + 1} reward: {episode_reward:.2f}")
mean_reward = sum(episode_rewards) / len(episode_rewards)
std_reward = (sum((r - mean_reward) ** 2 for r in episode_rewards) / len(episode_rewards)) ** 0.5
print(f"mean_reward={mean_reward:.2f} +/- {std_reward:.2f}")
print(f"Success rate: {success_rate / 100:.2%}")

# Plot the rewards
def moving_average(data, window_size=30):
    return np.convolve(data, np.ones(window_size)/window_size, mode='valid')
plt.plot(moving_average(episode_rewards, 30), label='Test Rewards')
plt.legend()
plt.xlabel('Episode')
plt.ylabel('Total Reward')
plt.title('Rewards per Episode during Testing(Bipedal-Walker)')
plt.grid()
plt.savefig('test_rewards.png')
plt.show()