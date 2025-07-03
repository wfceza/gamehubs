
import { useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { User, Trophy, Gamepad, Target, Edit3, Save, X } from "lucide-react";

const ProfilePage = ({ currentUser }) => {
  const { updateProfile } = useProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    username: currentUser.username
  });

  const handleSaveProfile = async () => {
    const { error } = await updateProfile({ username: editForm.username });
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Your profile has been updated!"
      });
      setIsEditing(false);
    }
  };

  const winRate = currentUser.games_played > 0 
    ? Math.round((currentUser.wins / currentUser.games_played) * 100) 
    : 0;

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Your Profile</h2>
        <p className="text-blue-200">Manage your account and view your gaming statistics</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Profile Information */}
        <Card className="bg-white/10 border-white/20 backdrop-blur-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center">
              <User className="w-5 h-5 mr-2" />
              Profile Information
            </CardTitle>
            {!isEditing ? (
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Edit
              </Button>
            ) : (
              <div className="flex space-x-2">
                <Button
                  onClick={handleSaveProfile}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button
                  onClick={() => {
                    setIsEditing(false);
                    setEditForm({ username: currentUser.username });
                  }}
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-white">Username</Label>
              {isEditing ? (
                <Input
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  className="mt-1 bg-white/10 border-white/20 text-white"
                />
              ) : (
                <div className="mt-1 p-2 bg-white/5 rounded border border-white/10 text-white">
                  {currentUser.username}
                </div>
              )}
            </div>
            <div>
              <Label className="text-white">Email</Label>
              <div className="mt-1 p-2 bg-white/5 rounded border border-white/10 text-gray-300">
                {currentUser.email}
              </div>
            </div>
            <div>
              <Label className="text-white">Member Since</Label>
              <div className="mt-1 p-2 bg-white/5 rounded border border-white/10 text-gray-300">
                {new Date(currentUser.created_at).toLocaleDateString()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gaming Statistics */}
        <Card className="bg-white/10 border-white/20 backdrop-blur-lg">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Trophy className="w-5 h-5 mr-2" />
              Gaming Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-white/10 rounded-lg">
                <Trophy className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{currentUser.gold}</div>
                <div className="text-sm text-blue-200">Total Gold</div>
              </div>
              
              <div className="text-center p-4 bg-white/10 rounded-lg">
                <Gamepad className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{currentUser.games_played}</div>
                <div className="text-sm text-blue-200">Games Played</div>
              </div>
              
              <div className="text-center p-4 bg-white/10 rounded-lg">
                <Target className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{currentUser.wins}</div>
                <div className="text-sm text-blue-200">Wins</div>
              </div>
              
              <div className="text-center p-4 bg-white/10 rounded-lg">
                <div className="text-2xl font-bold text-white">{winRate}%</div>
                <div className="text-sm text-blue-200">Win Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card className="bg-white/10 border-white/20 backdrop-blur-lg lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-white">Achievements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3 p-3 bg-white/10 rounded-lg">
                <Badge className={currentUser.games_played >= 1 ? "bg-green-600" : "bg-gray-600"}>
                  {currentUser.games_played >= 1 ? "✓" : "○"}
                </Badge>
                <div>
                  <div className="text-white font-medium">First Game</div>
                  <div className="text-sm text-gray-300">Play your first game</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-white/10 rounded-lg">
                <Badge className={currentUser.wins >= 1 ? "bg-green-600" : "bg-gray-600"}>
                  {currentUser.wins >= 1 ? "✓" : "○"}
                </Badge>
                <div>
                  <div className="text-white font-medium">First Victory</div>
                  <div className="text-sm text-gray-300">Win your first game</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-white/10 rounded-lg">
                <Badge className={currentUser.wins >= 10 ? "bg-green-600" : "bg-gray-600"}>
                  {currentUser.wins >= 10 ? "✓" : "○"}
                </Badge>
                <div>
                  <div className="text-white font-medium">Game Master</div>
                  <div className="text-sm text-gray-300">Win 10 games</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-white/10 rounded-lg">
                <Badge className={currentUser.gold >= 200 ? "bg-green-600" : "bg-gray-600"}>
                  {currentUser.gold >= 200 ? "✓" : "○"}
                </Badge>
                <div>
                  <div className="text-white font-medium">Gold Collector</div>
                  <div className="text-sm text-gray-300">Accumulate 200 Gold</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-white/10 rounded-lg">
                <Badge className={winRate >= 70 && currentUser.games_played >= 10 ? "bg-green-600" : "bg-gray-600"}>
                  {winRate >= 70 && currentUser.games_played >= 10 ? "✓" : "○"}
                </Badge>
                <div>
                  <div className="text-white font-medium">Champion</div>
                  <div className="text-sm text-gray-300">70% win rate (10+ games)</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-white/10 rounded-lg">
                <Badge className={currentUser.games_played >= 100 ? "bg-green-600" : "bg-gray-600"}>
                  {currentUser.games_played >= 100 ? "✓" : "○"}
                </Badge>
                <div>
                  <div className="text-white font-medium">Veteran</div>
                  <div className="text-sm text-gray-300">Play 100 games</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;
