import gymnasium as gym
import torch
import numpy as np
from gymnasium.wrappers import RecordEpisodeStatistics, RecordVideo
import matplotlib.pyplot as plt
# Define the Actor network (same architecture as during training)
class Actor(torch.nn.Module):
    def __init__(self, state_size, action_size, hidden_size=256):
        super(Actor, self).__init__()
        self.fc1 = torch.nn.Linear(state_size, hidden_size)
        self.fc2 = torch.nn.Linear(hidden_size, hidden_size)
        self.fc3 = torch.nn.Linear(hidden_size, action_size)
        
    def forward(self, state):
        x = torch.relu(self.fc1(state))
        x = torch.relu(self.fc2(x))
        return torch.tanh(self.fc3(x))

def test_trained_model(env_name='BipedalWalker-v3', actor_path="ddpg_actor.pth", num_episodes=100):
    # Initialize environment
    env = gym.make(env_name,)  # 'human' for visualization
    #env = RecordVideo(env, video_folder="videos", name_prefix="eval",episode_trigger=lambda x: True)
    #env = RecordEpisodeStatistics(env, buffer_length=10)
    state_size = env.observation_space.shape[0]
    action_size = env.action_space.shape[0]
    
    # Load trained actor
    actor = Actor(state_size, action_size)
    actor.load_state_dict(torch.load(actor_path, map_location='cpu'))
    actor.eval()  # Set to evaluation mode
    test_rewards = []
    for episode in range(num_episodes):
        state, _ = env.reset()# seed=42  Reset the same environment
        total_reward = 0
        while True:
            with torch.no_grad():
                state_tensor = torch.FloatTensor(state).unsqueeze(0)
                action = actor(state_tensor).numpy()[0]
                
            next_state, reward, terminated, truncated, _ = env.step(action)
            total_reward += reward
            state = next_state
            
            if terminated or truncated:
                print(f"Episode: {episode+1}, Total Reward: {total_reward:.2f}")
                test_rewards.append(total_reward)
                break
                
    env.close()
    print(f"Average Reward over {num_episodes} episodes: {np.mean(test_rewards):.2f}")
    return test_rewards


# Run the test
test_rewards=test_trained_model(num_episodes=100)

def moving_average(data, window_size=30):
    return np.convolve(data, np.ones(window_size)/window_size, mode='valid')
plt.plot(moving_average(test_rewards, 30), label='Test Rewards')
plt.legend()
plt.xlabel('Episode')
plt.ylabel('Total Reward')
plt.title('Rewards per Episode during Testing(Bipedal-Walker)')
plt.grid()
plt.savefig('test_rewards.png')
plt.show()