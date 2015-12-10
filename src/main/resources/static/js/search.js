var Search = React.createClass({
    getInitialState: function () {
        return {jqXHR: null, results: {}, query: ""};
    },
    handleQuery: function (event) {
        if (event.type === 'submit') {
            event.preventDefault();
        } else {
            var oldQuery = this.state.query;
            var newQuery = event.target.value;
            console.log(newQuery);
            this.setState({query: newQuery});
            this.fetchResults(oldQuery, newQuery, this.state.jqXHR)
        }
    },
    fetchResults: function (oldQuery, newQuery, jqXHR) {
        //if (newQuery != null && newQuery.length > 3) {
        if (newQuery != null) {
            if (jqXHR && jqXHR.readyState !== 4) {
                jqXHR.abort();
            }
            this.setState({
                jqXHR: $.ajax({
                    url: 'http://localhost:8983/solr/tweets/query',
                    type: 'POST',
                    //dataType: "json",
                    contentType: "application/json; charset=utf-8",
                    data: '{query: "' + newQuery + '"}',
                    success: function (response) {
                        console.log(response);
                        this.setState({results: response});
                    }.bind(this),
                    error: function (xhr, status, err) {
                        console.error(xhr.responseText);
                    }.bind(this)
                })
            });
        } else {
            this.setState({results: {}});
        }
    },
    render: function () {
        return (
            <div>
                <div>
                    <div className="navbar bg-faded">
                        <a className="navbar-brand" href="#">Search</a>
                        <form className="form-inline">
                            <div className="form-group">
                                <div className="input-group">
                                    <input className="form-control" type="text"
                                           value={this.state.query} onChange={this.handleQuery}
                                           placeholder="Type your query" size="60"/>
                                    <div className="input-group-addon">
                                        <i className="fa fa-search"/>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
                <div className="container-fluid">
                    <div className="row">
                        <div className="col-md-10">
                            <Search.ResultList results={this.state.results}/>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
});

Search.ResultList = React.createClass({
    render: function () {
        var resultNodes;
        var query = this.props.query;
        var results = this.props.results;
        if (results.hasOwnProperty('response')) {
            var tweets = results.response.docs;
            if (tweets.length <= 0) {
                resultNodes = (<div><p>No results!</p></div>)
            } else {
                resultNodes = tweets.map(function (tweet) {
                    return (
                        <Search.Tweet key={tweet.id} tweet={tweet} query={query}/>
                    );
                });
            }
            return (
                <div className="col-md-10">
                    {resultNodes}
                </div>
            );
        }
        return (
            <div></div>
        );
    }
});

Search.Tweet = React.createClass({
    render: function () {
        var query = this.props.query;
        var tweet = this.props.tweet;
        var profileImage = tweet["user.profile_image"].replace("normal", "bigger");
        console.log(tweet["user.profile_image"]);
        return (
            <div className="media">
                <a className="media-left" href="#">
                    <img className="media-object" src={profileImage}/>
                </a>
                <div className="media-body">
                    <h4 className="media-heading">{tweet["user.name"]}</h4>
                    {tweet.text}
                </div>
            </div>
        );
    }
});

ReactDOM.render(
    <Search />,
    document.getElementById('content')
);