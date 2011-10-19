from cdw import cdw
from cdw.forms import PostForm
from cdwapi import (jsonify, not_found_on_error, auth_token_or_logged_in_required)                          
from flask import request, current_app, abort
from flaskext.login import current_user

def load_views(blueprint):
    
    @blueprint.route('/threads/<id>', methods=['GET'])
    @not_found_on_error
    def threads_show(id):
        thread = cdw.threads.with_id(id)
        result = thread.as_dict()
        result.update({"posts": [p.as_dict() for p in cdw.posts.with_fields(**{"thread": thread})]})
        return jsonify(result)
    
    @blueprint.route('/threads/<id>/remove', methods=['POST'])
    @not_found_on_error
    @auth_token_or_logged_in_required
    def threads_remove(id):
        return jsonify(cdw.delete_thread(cdw.threads.with_id(id)))
    
    @blueprint.route('/threads/<id>/posts', methods=['GET'])
    @not_found_on_error
    def threads_posts_get(id):
        return jsonify(cdw.posts.with_fields(**{"thread":cdw.threads.with_id(id)}))
    
    @blueprint.route('/threads/<id>/posts', methods=['POST'])
    @not_found_on_error
    @auth_token_or_logged_in_required
    def threads_posts_post(id):
        form = PostForm(request.form, csrf_enabled=False)
        if form.validate():
            thread = cdw.threads.with_id(id)
            post = form.to_post()
            
            if current_user.is_authenticated() and str(post.user.id) != str(current_user.id):
                current_app.logger.error('Logged in user trying to post message on behalf of another user')
                abort(400)
            
            return jsonify(cdw.post_to_thread(thread, post))
        else:
            return jsonify({"errors": form.errors}, 400)